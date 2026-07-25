const {
  IBApi,
  EventName,
  SecType,
  OrderAction,
  OrderType,
  ErrorCode,
} = require('@stoqey/ib');
const { parseIbFundamentalXml, mapRatiosToMetrics } = require('./fundamentalParse');

const TICK_LAST = 4;
const TICK_CLOSE = 9;
const TICK_BID = 1;
const TICK_ASK = 2;
const TICK_DELAYED_BID = 66;
const TICK_DELAYED_ASK = 67;
const TICK_DELAYED_LAST = 68;
const TICK_DELAYED_CLOSE = 72;

function mapTickPrice(tickType, price, patch) {
  if (tickType === TICK_LAST || tickType === TICK_DELAYED_LAST) patch.last = price;
  if (tickType === TICK_CLOSE || tickType === TICK_DELAYED_CLOSE) patch.close = price;
  if (tickType === TICK_BID || tickType === TICK_DELAYED_BID) patch.bid = price;
  if (tickType === TICK_ASK || tickType === TICK_DELAYED_ASK) patch.ask = price;
}

class IbkrAdapter {
  constructor() {
    this.ib = null;
    this.status = 'disconnected';
    this.lastError = null;
    this.nextOrderId = null;
    this.quotes = new Map();
    this.reqIdToSymbol = new Map();
    this.symbolToReqId = new Map();
    this.nextReqId = 1000;
    this.openOrders = [];
    this.positions = [];
    this.accountSummary = [];
    this.managedAccounts = [];
    this.onQuote = null;
    this.onStatusChange = null;
    this.onOrderUpdate = null;
    this.settings = {};
    this._pendingOpenOrders = null;
    this._pendingPositions = null;
    this._pendingAccountSummary = null;
  }

  setCallbacks({ onQuote, onStatusChange, onOrderUpdate }) {
    this.onQuote = onQuote;
    this.onStatusChange = onStatusChange;
    this.onOrderUpdate = onOrderUpdate;
  }

  _setStatus(status, error = null) {
    this.status = status;
    this.lastError = error;
    if (this.onStatusChange) {
      this.onStatusChange({ status, error });
    }
  }

  _emitQuote(symbol, patch) {
    const prev = this.quotes.get(symbol) || { symbol };
    const next = { ...prev, ...patch, updatedAt: Date.now() };
    this.quotes.set(symbol, next);
    if (this.onQuote) {
      this.onQuote(next);
    }
  }

  connect(settings) {
    if (this.ib && this.status === 'connected') {
      return Promise.resolve({ status: 'connected' });
    }

    this.settings = settings || {};
    const host = settings.host || '127.0.0.1';
    const port = Number(settings.port) || 4002;
    const clientId = Number(settings.clientId) || 1;

    if (this.ib) {
      try {
        this.unsubscribeAllQuotes();
      } catch (_) {
        /* ignore */
      }
      try {
        this.ib.disconnect();
      } catch (_) {
        /* ignore */
      }
      this.ib = null;
    }

    this._setStatus('connecting');

    return new Promise((resolve, reject) => {
      const ib = new IBApi({ host, port, clientId });
      this.ib = ib;

      const fail = (err) => {
        this._setStatus('error', err?.message || String(err));
        reject(err);
      };

      const timeout = setTimeout(() => {
        fail(new Error('Connection timed out — is IB Gateway running?'));
      }, 15000);

      ib.on(EventName.connected, () => {
        /* socket open */
      });

      ib.on(EventName.error, (err, code, reqId) => {
        const msg = err?.message || String(err);
        if (code === ErrorCode.CONNECT_FAIL) {
          clearTimeout(timeout);
          fail(err);
          return;
        }
        if (code !== ErrorCode.NO_SECURITY_DEFINITION) {
          this.lastError = msg;
          if (this.status === 'connected' && reqId != null && this.reqIdToSymbol.has(reqId)) {
            if (this.onStatusChange) {
              this.onStatusChange({
                status: this.status,
                error: msg,
                mode: this.settings.mode || 'paper',
              });
            }
          }
        }
      });

      ib.on(EventName.disconnected, () => {
        this._setStatus('disconnected');
      });

      ib.on(EventName.nextValidId, (orderId) => {
        clearTimeout(timeout);
        this.nextOrderId = orderId;
        const mdType = Number(this.settings.marketDataType);
        try {
          ib.reqMarketDataType(Number.isFinite(mdType) && mdType > 0 ? mdType : 3);
        } catch (_) {
          /* ignore */
        }
        this._setStatus('connected');
        resolve({ status: 'connected', orderId });
      });

      ib.on(EventName.managedAccounts, (accounts) => {
        this.managedAccounts = accounts.split(',').filter(Boolean);
      });

      ib.on(EventName.tickPrice, (reqId, tickType, price) => {
        const symbol = this.reqIdToSymbol.get(reqId);
        if (!symbol || price === undefined || Number.isNaN(price) || price <= 0) return;
        const patch = {};
        mapTickPrice(tickType, price, patch);
        if (Object.keys(patch).length) {
          const q = this.quotes.get(symbol);
          const close = patch.close ?? q?.close;
          const last = patch.last ?? q?.last;
          const ref = last ?? close;
          const base = close ?? last;
          if (ref != null && base != null && base !== 0) {
            patch.change = ref - base;
            patch.changePct = ((ref - base) / base) * 100;
          }
          this._emitQuote(symbol, patch);
        }
      });

      ib.on(EventName.openOrder, (orderId, contract, order, orderState) => {
        const entry = {
          orderId,
          symbol: contract.symbol,
          action: order.action,
          totalQuantity: order.totalQuantity,
          orderType: order.orderType,
          lmtPrice: order.lmtPrice,
          status: orderState.status,
        };
        const idx = this.openOrders.findIndex((o) => o.orderId === orderId);
        if (idx >= 0) this.openOrders[idx] = entry;
        else this.openOrders.push(entry);
        if (this.onOrderUpdate) this.onOrderUpdate({ type: 'openOrder', order: entry });
      });

      ib.on(EventName.orderStatus, (orderId, status) => {
        const order = this.openOrders.find((o) => o.orderId === orderId);
        if (order) order.status = status;
        if (this.onOrderUpdate) {
          this.onOrderUpdate({ type: 'orderStatus', orderId, status });
        }
      });

      ib.on(EventName.openOrderEnd, () => {
        const orders = [...this.openOrders];
        if (this._pendingOpenOrders) {
          this._pendingOpenOrders(orders);
          this._pendingOpenOrders = null;
        }
        if (this.onOrderUpdate) {
          this.onOrderUpdate({ type: 'openOrderEnd', orders });
        }
      });

      ib.on(EventName.position, (account, contract, pos, avgCost) => {
        const entry = {
          account,
          symbol: contract.symbol,
          secType: contract.secType,
          currency: contract.currency,
          exchange: contract.exchange,
          position: pos,
          avgCost,
        };
        const idx = this.positions.findIndex(
          (p) => p.symbol === entry.symbol && p.account === entry.account,
        );
        if (idx >= 0) this.positions[idx] = entry;
        else this.positions.push(entry);
      });

      ib.on(EventName.positionEnd, () => {
        const positions = [...this.positions];
        if (this._pendingPositions) {
          this._pendingPositions(positions);
          this._pendingPositions = null;
        }
        if (this.onOrderUpdate) {
          this.onOrderUpdate({ type: 'positionEnd', positions });
        }
      });

      ib.on(EventName.accountSummary, (reqId, account, tag, value, currency) => {
        this.accountSummary.push({ account, tag, value, currency });
      });

      ib.on(EventName.accountSummaryEnd, () => {
        const summary = [...this.accountSummary];
        if (this._pendingAccountSummary) {
          this._pendingAccountSummary(summary);
          this._pendingAccountSummary = null;
        }
        if (this.onOrderUpdate) {
          this.onOrderUpdate({ type: 'accountSummaryEnd', summary });
        }
      });

      ib.connect();
      ib.reqIds();
    });
  }

  disconnect() {
    if (this.ib) {
      try {
        this.unsubscribeAllQuotes();
      } catch (_) {
        /* ignore */
      }
      try {
        this.ib.disconnect();
      } catch (_) {
        /* ignore */
      }
      this.ib = null;
    } else {
      this.reqIdToSymbol.clear();
      this.symbolToReqId.clear();
    }
    this.nextOrderId = null;
    this._setStatus('disconnected');
    return { status: 'disconnected' };
  }

  getConnectionStatus() {
    return {
      status: this.status,
      error: this.lastError,
      mode: this.settings.mode || 'paper',
    };
  }

  _contractFromSymbol(entry) {
    const raw =
      typeof entry === 'string'
        ? entry
        : entry?.symbol || entry?.ticker || '';
    const symbol = String(raw).trim();
    if (!symbol) {
      throw new Error('Missing symbol for quote or order');
    }
    const exchange = (typeof entry === 'object' && entry?.exchange) || 'SMART';
    const currency = (typeof entry === 'object' && entry?.currency) || 'USD';
    return {
      symbol: symbol.toUpperCase(),
      secType: SecType.STK,
      exchange,
      currency,
    };
  }

  subscribeQuotes(symbols) {
    if (!this.ib || this.status !== 'connected') {
      return { subscribed: [] };
    }

    const subscribed = [];
    for (const entry of symbols) {
      let contract;
      try {
        contract = this._contractFromSymbol(entry);
      } catch {
        continue;
      }
      const sym = contract.symbol;
      if (this.symbolToReqId.has(sym)) {
        subscribed.push(sym);
        continue;
      }
      const reqId = this.nextReqId++;
      this.reqIdToSymbol.set(reqId, sym);
      this.symbolToReqId.set(sym, reqId);
      if (!this.quotes.has(sym)) {
        this.quotes.set(sym, { symbol: sym });
      }
      this.ib.reqMktData(reqId, contract, '', false, false);
      subscribed.push(sym);
    }
    return { subscribed };
  }

  unsubscribeAllQuotes() {
    if (!this.ib) return;
    for (const [sym, reqId] of this.symbolToReqId.entries()) {
      try {
        this.ib.cancelMktData(reqId);
      } catch (_) {
        /* ignore */
      }
      this.reqIdToSymbol.delete(reqId);
      this.symbolToReqId.delete(sym);
    }
  }

  getQuotes() {
    return Object.fromEntries(this.quotes);
  }

  placeOrder({ symbol, side, quantity, orderType, limitPrice, tif, exchange, currency }) {
    if (!this.ib || this.status !== 'connected' || this.nextOrderId == null) {
      throw new Error('Not connected to IB Gateway');
    }

    const orderId = this.nextOrderId++;
    const contract = this._contractFromSymbol({ symbol, exchange, currency });
    const action = side === 'SELL' ? OrderAction.SELL : OrderAction.BUY;
    const type = orderType === 'LMT' ? OrderType.LMT : OrderType.MKT;

    const order = {
      orderId,
      action,
      orderType: type,
      totalQuantity: Number(quantity),
      tif: tif || 'DAY',
    };

    if (type === OrderType.LMT && limitPrice != null) {
      order.lmtPrice = Number(limitPrice);
    }

    const accountId = this.settings.accountId;
    if (accountId) order.account = accountId;

    this.ib.placeOrder(orderId, contract, order);
    return { orderId, symbol: contract.symbol, action, orderType: type, quantity: order.totalQuantity };
  }

  cancelOrder(orderId) {
    if (!this.ib || this.status !== 'connected') {
      throw new Error('Not connected to IB Gateway');
    }
    this.ib.cancelOrder(Number(orderId));
    return { cancelled: orderId };
  }

  _awaitIbSnapshot({ reset, request, onEndSetter, timeoutMs = 8000 }) {
    if (!this.ib || this.status !== 'connected') {
      return Promise.resolve([]);
    }
    return new Promise((resolve) => {
      reset();
      const timer = setTimeout(() => {
        onEndSetter(null);
        resolve([]);
      }, timeoutMs);
      onEndSetter((rows) => {
        clearTimeout(timer);
        onEndSetter(null);
        resolve(rows);
      });
      request();
    });
  }

  getOpenOrders() {
    return this._awaitIbSnapshot({
      reset: () => {
        this.openOrders = [];
      },
      request: () => this.ib.reqAllOpenOrders(),
      onEndSetter: (fn) => {
        this._pendingOpenOrders = fn;
      },
    });
  }

  refreshOpenOrders() {
    return this.getOpenOrders();
  }

  getPositions() {
    return this._awaitIbSnapshot({
      reset: () => {
        this.positions = [];
      },
      request: () => this.ib.reqPositions(),
      onEndSetter: (fn) => {
        this._pendingPositions = fn;
      },
    });
  }

  refreshPositions() {
    return this.getPositions();
  }

  getAccountSummary() {
    return this._awaitIbSnapshot({
      reset: () => {
        this.accountSummary = [];
      },
      request: () =>
        this.ib.reqAccountSummary(
          9001,
          'All',
          'NetLiquidation,TotalCashValue,BuyingPower,GrossPositionValue',
        ),
      onEndSetter: (fn) => {
        this._pendingAccountSummary = fn;
      },
    });
  }

  refreshAccountSummary() {
    return this.getAccountSummary();
  }

  _reqFundamentalReport(contract, reportType) {
    return new Promise((resolve) => {
      if (!this.ib || this.status !== 'connected') {
        resolve('');
        return;
      }
      const reqId = this.nextReqId++;
      const timer = setTimeout(() => {
        this.ib.removeListener(EventName.fundamentalData, handler);
        resolve('');
      }, 12000);

      const handler = (rid, data) => {
        if (rid !== reqId) return;
        clearTimeout(timer);
        this.ib.removeListener(EventName.fundamentalData, handler);
        resolve(data || '');
      };

      this.ib.on(EventName.fundamentalData, handler);
      try {
        this.ib.reqFundamentalData(reqId, contract, reportType, []);
      } catch (_) {
        clearTimeout(timer);
        this.ib.removeListener(EventName.fundamentalData, handler);
        resolve('');
      }
    });
  }

  async getFundamentals(entry) {
    if (!this.ib || this.status !== 'connected') {
      return { symbol: '', metrics: {}, fieldCount: 0, error: 'Connect IB in Settings first' };
    }

    let contract;
    try {
      contract = this._contractFromSymbol(entry);
    } catch (e) {
      return { symbol: '', metrics: {}, fieldCount: 0, error: e.message || 'Invalid symbol' };
    }

    const reports = ['ReportSnapshot', 'ReportsFinSummary'];
    const merged = {};
    for (const reportType of reports) {
      const xml = await this._reqFundamentalReport(contract, reportType);
      Object.assign(merged, parseIbFundamentalXml(xml));
    }

    const metrics = mapRatiosToMetrics(merged);
    const fieldCount = Object.keys(metrics).length;

    return {
      symbol: contract.symbol,
      metrics,
      fieldCount,
      error: fieldCount
        ? null
        : 'No ratio data from IB — enable fundamental data for this exchange in TWS / account subscriptions',
    };
  }
}

module.exports = { IbkrAdapter };
