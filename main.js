'use strict';

module.exports = {
  load () {
    Editor.Metrics.trackEvent({
        category: 'Packages',
        label: 'raphael-package',
        action: 'Load package'
    }, null);
  },

  unload () {
    // execute when package unloaded
  },

  // register your ipc messages here
  messages: {
    'open' () {
      // open entry panel registered in package.json
      Editor.Panel.open('raphael-package');

      Editor.Metrics.trackEvent({
        category: 'Packages',
        label: 'raphael-package',
        action: 'Panel Open'
      }, null);
    }
  },
};