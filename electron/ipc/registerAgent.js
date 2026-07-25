const { ipcMain } = require('electron');
const { createAgentService } = require('../providers/agentService');

function registerAgentIpc() {
  const agent = createAgentService();

  ipcMain.handle('agent:getConfig', async () => agent.readConfig());

  ipcMain.handle('agent:setConfig', async (_e, patch) => agent.writeConfig(patch || {}));

  ipcMain.handle('agent:setActiveProfile', async (_e, profileId) => agent.setActiveProfile(profileId));

  ipcMain.handle('agent:updateProfile', async (_e, profileId, fields) =>
    agent.updateProfile(profileId, fields || {}),
  );

  ipcMain.handle('agent:addProfile', async (_e, templateId) => agent.addProfile(templateId));

  ipcMain.handle('agent:test', async () => agent.testConnection());

  ipcMain.handle('agent:chat', async (_e, payload) =>
    agent.chat({
      messages: payload?.messages || [],
      context: payload?.context || {},
    }),
  );
}

module.exports = { registerAgentIpc };
