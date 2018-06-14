'use strict';

var Menu = remote.Menu,
    MenuItem = remote.MenuItem;

var appSettings = new wpeSettings();
appSettings.init();

// MENUS
var template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Quit',
        accelerator: 'Ctrl+Q',
        click: function() { remote.app.quit(); }
      },
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        role: 'undo'
      },
      {
        label: 'Redo',
        accelerator: 'Shift+CmdOrCtrl+Z',
        role: 'redo'
      },
      {
        type: 'separator'
      },
      {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        role: 'cut'
      },
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        role: 'copy'
      },
      {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        role: 'paste'
      },
      {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        role: 'selectall'
      },
    ]
  },
  {
    label: 'Settings',
    role: 'settings',
    submenu: [
      {
        label: 'Defaults',
        click: function(item, focusedWindow) {
          if (focusedWindow) {
            $('#aboutModal').modal('hide');
            $('#advancedModal').modal('hide');
            $('#defaultsModal').modal('toggle');
            $('#addThemeModal').modal('hide');
            $('#addPluginModal').modal('hide');
          }
        }
      },
      {
        label: 'Advanced',
        click: function(item, focusedWindow) {
          if (focusedWindow) {
            $('#aboutModal').modal('hide');
            $('#advancedModal').modal('toggle');
            $('#defaultsModal').modal('hide');
            $('#addThemeModal').modal('hide');
            $('#addPluginModal').modal('hide');
          }
        }
      },
      {
        type: 'separator'
      }
    ]
  },
  {
    label: 'Help',
    role: 'help',
    submenu: [
      {
        label: 'Support',
        click: function() {
          shell.openExternal('https://github.com/ractoon/wp-express/issues');
        }
      },
    ]
  },
];

if (process.platform == 'darwin') {
  var name = remote.app.getName();

  template.unshift({
    label: name,
    submenu: [
      {
        label: 'About ' + name,
        click: function(item, focusedWindow) {
          if (focusedWindow) {
            $('#advancedModal').modal('hide');
            $('#aboutModal').modal('toggle');
            $('#defaultsModal').modal('hide');
            $('#addThemeModal').modal('hide');
            $('#addPluginModal').modal('hide');
          }
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Hide ' + name,
        accelerator: 'Command+H',
        role: 'hide'
      },
      {
        label: 'Hide Others',
        accelerator: 'Command+Shift+H',
        role: 'hideothers'
      },
      {
        label: 'Show All',
        role: 'unhide'
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: function() { remote.app.quit(); }
      },
    ]
  });

  // remove File menu entry
  template.splice(1, 1);
}
else {
  template[3].submenu.push(
    {
      type: 'separator'
    },
    {
      label: 'About WP Express',
      click: function(item, focusedWindow) {
        if (focusedWindow) {
          $('#advancedModal').modal('hide');
          $('#aboutModal').modal('toggle');
          $('#defaultsModal').modal('hide');
          $('#addThemeModal').modal('hide');
          $('#addPluginModal').modal('hide');
        }
      }
    }
  );
}

var menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);