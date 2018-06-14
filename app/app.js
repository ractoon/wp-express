const { app, shell, ipcRenderer, remote } = require('electron'),
      { dialog } = require('electron').remote;

var spawn = require('child_process').spawn,
    spawnsync = require('child_process').spawnSync,
    fs = require('fs'),
    glob = require('glob'),
    validator = require('validator'),
    databases = [],
    path = require('path'),
    url = require('url'),
    cwd  = path.join(__dirname, '..'),
    dbDefaultsFound = false,
    defaultPathToBin,
    errorDump = '',
    pathToBin,
    pathPrefix = __dirname + '/bin',
    pathToWP;

var appSettings = new wpeSettings();
appSettings.init();

// if in packaged file modify paths
if (fs.existsSync(path.join(cwd, 'app.asar'))) {
  pathPrefix = path.join(__dirname, '../app.asar.unpacked/bin');
}

var pathToWPCLI = pathPrefix + "/wp-cli.phar",
    pathToDBCLI = pathPrefix + "/db.php",
    pathToWPAPI = pathPrefix + "/wpapi.php";

switch (process.platform) {
  case "darwin":
    defaultPathToBin = pathPrefix + "/osx/php";
    break;
  case "win32":
    defaultPathToBin = pathPrefix + "/win32/php/php.exe";
    break;
}

pathToBin = defaultPathToBin;

// if a custom bin path has been specified use that instead
if (appSettings.get('phpBinPath')) {
  pathToBin = appSettings.get('phpBinPath');
}

// view bindings
// https://github.com/lain-dono/vue-dnd
// Vue.use(require('vue-drag-and-drop'));

Vue.transition('slide', {
  afterLeave: function (el) {
    $('.tooltip').remove();
  }
});

var vm = new Vue({
  el: '#appView',
  data: {
    currentStep: 0,
    isProVersion: false,
    updateAvailable: false,
    updateMessage: '',
    bundles: [],
    themes: [],
    plugins: [],
    language: '',
    loadingWPPlugins: false,
    wpplugins: [],
    loadingWPThemes: false,
    wpthemes: [],
    checkingLicenseKey: false,
    licenseKey: '',
    licenseEmail: '',
    licenseName: ''
  },
  methods: {
    addWPPlugin: function(name, slug) {
      if (!pluginAlreadySelected(slug)) {
        this.plugins.push({
          type: 'wordpress',
          name: name,
          location: slug,
          tooltip: 'Plugin will be installed from the WordPress Directory',
          active: true
        });
      }

      setTimeout(function() {
        $('#pluginDirectorySearch').val('').trigger('keyup');
      }, 250);

      $('#addPluginModal').modal('hide');
    },
    submitPluginURLField: function() {
      var pluginURL = $('#pluginURLField').val(),
          pluginURLContainer = $('#pluginURLField').parent(),
          pluginURLHelpText = $('#pluginURLHelpBlock');

      pluginURLContainer.removeClass('has-error');
      pluginURLHelpText.text('URL for plugin zip file');

      if (pluginURL !== '') {
        if (isValidURL(pluginURL)) {
          if (!pluginAlreadySelected(pluginURL)) {
            this.plugins.push({
              type: 'link',
              name: url.parse(pluginURL).pathname,
              location: pluginURL,
              tooltip: 'Plugin will be downloaded from ' + pluginURL,
              active: true
            });
          }

          setTimeout(function() {
            $('#pluginURLField').val('');
          }, 250);
          
          $('#addPluginModal').modal('hide');
        }
        else {
          pluginURLContainer.addClass('has-error');
          pluginURLHelpText.text('Invalid URL to zip file, please enter in the format https://www.example.com/plugin.zip');
        }
      }
      else {
        pluginURLContainer.addClass('has-error');
        pluginURLHelpText.text('Please enter the URL to the plugin zip file');
      }
    },
    addFilePlugin: function() {
      var selectedPlugins = dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'], 
        filters: [
          { name: 'Plugin', extensions: ['zip'] }
        ]
      });

      if (selectedPlugins !== undefined) {
        for (var i in selectedPlugins) {
          if (path.parse(selectedPlugins[i]).ext == '.zip' && !pluginAlreadySelected(selectedPlugins[i])) {
            this.plugins.push({
              type: 'file-zip-o',
              name: path.parse(selectedPlugins[i]).name,
              location: selectedPlugins[i],
              tooltip: 'Plugin will be copied from ' + selectedPlugins[i],
              active: true
            });
          }
        }
      
        $('#addPluginModal').modal('hide');
      }
    },
    removePlugin: function(index) {
      this.plugins.splice(index, 1);
    },
    sortPlugin: function(draggedElement, dropppedOnElement) {
      var placeholder = this.plugins[draggedElement.getAttribute('data-index')];
      this.plugins.$set(draggedElement.getAttribute('data-index'), this.plugins[dropppedOnElement.getAttribute('data-index')]);
      this.plugins.$set(dropppedOnElement.getAttribute('data-index'), placeholder);
    },
    togglePluginActive: function(index, event) {
      var target = $(event.target);

      if (target.is(':checked')) {
        this.plugins[index].active = true;
      }
      else {
        this.plugins[index].active = false;
      }
    },
    addWPTheme: function(name, slug) {
      if (!themeAlreadySelected(slug)) {
        this.themes.push({
          type: 'wordpress',
          name: name,
          location: slug,
          tooltip: 'Theme will be installed from the WordPress Directory',
          active: false
        });
      }

      setTimeout(function() {
        $('#themeDirectorySearch').val('').trigger('keyup');
      }, 250);

      $('#addThemeModal').modal('hide');
    },
    submitThemeURLField: function() {
      var themeURL = $('#themeURLField').val(),
          themeURLContainer = $('#themeURLField').parent(),
          themeURLHelpText = $('#themeURLHelpBlock');

      themeURLContainer.removeClass('has-error');
      themeURLHelpText.text('URL for theme zip file');

      if (themeURL !== '') {
        if (isValidURL(themeURL)) {
          if (!themeAlreadySelected(themeURL)) {
            this.themes.push({
              type: 'link',
              name: url.parse(themeURL).pathname,
              location: themeURL,
              tooltip: 'Theme will be downloaded from ' + themeURL,
              active: false
            });
          }

          setTimeout(function() {
            $('#themeURLField').val('');
          }, 250);
          
          $('#addThemeModal').modal('hide');
        }
        else {
          themeURLContainer.addClass('has-error');
          themeURLHelpText.text('Invalid URL to zip file, please enter in the format https://www.example.com/theme.zip');
        }
      }
      else {
        themeURLContainer.addClass('has-error');
        themeURLHelpText.text('Please enter the URL to the theme zip file');
      }
    },
    addFileTheme: function() {
      var selectedThemes = dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'], 
        filters: [
          { name: 'Theme', extensions: ['zip'] }
        ]
      });

      if (selectedThemes !== undefined) {
        for (var i in selectedThemes) {
          if (path.parse(selectedThemes[i]).ext == '.zip') {
            if (!themeAlreadySelected(selectedThemes[i])) {
              this.themes.push({
                type: 'file-zip-o',
                name: path.parse(selectedThemes[i]).name,
                location: selectedThemes[i],
                tooltip: 'Theme will be copied from ' + selectedThemes[i],
                active: false
              });
            }
          }
        }
      
        $('#addThemeModal').modal('hide');
      }
    },
    removeTheme: function(index) {
      this.themes.splice(index, 1);
    },
    sortTheme: function(draggedElement, dropppedOnElement) {
      var placeholder = this.themes[draggedElement.getAttribute('data-index')];
      this.themes[draggedElement.getAttribute('data-index')] = this.themes[dropppedOnElement.getAttribute('data-index')];
      this.themes[dropppedOnElement.getAttribute('data-index')] = placeholder;
    },
    setActiveTheme: function(index, event) {
      var target = $(event.target),
          self = this;

      if (target.is(':checked')) {
        var uncheck = function() {
          setTimeout(function() {
            target.removeAttr('checked');
            self.themes[index].active = false;
          }, 0);
        };
        
        var unbind = function() {
          target.unbind('mouseup',up);
        };
        
        var up = function() {
          uncheck();
          unbind();
        };

        target.bind('mouseup',up);
        target.one('mouseout', unbind);
      }
    },
    toggleThemeActive: function(index, event) {
      var target = $(event.target);

      this.themes.map(function(t) { 
        t.active = false; 
        return t;
      });

      if (target.is(':checked')) {
        this.themes[index].active = true;
      }
    },
    restartApp: function() {
      ipcRenderer.send('restart-app', 'restart');
    }
  }
});

// check version type
if (vm.isProVersion) {
  document.title += ' Pro';

  // load bundles if available
  if (appSettings.getBundle('default')) {
    var savedBundle = appSettings.getBundle('default');
    vm.plugins = savedBundle.plugins;
    vm.themes = savedBundle.themes;
  }
}

$(function() {
  $('#drag-overlay').hide();
  $('#loading-overlay').hide();
  $('#notify-wrapper').hide();

  $('#currentVersion').text(remote.app.getVersion());

  var setInitialFocus = function(target, onlyIfEmpty) {
    var initialFocusTarget = $('.initial-focus', target);

    if (initialFocusTarget.length && (!onlyIfEmpty || (onlyIfEmpty && initialFocusTarget.val() == ''))) {
      setTimeout(function() {
        initialFocusTarget.focus();
      }, 1);
    }
  };

  $('.modal').on('shown.bs.modal', function(e) {
    document.activeElement.blur();
    $(this).find('.modal-body .initial-focus').focus();
  });

  $('a[data-toggle="pill"]').on('shown.bs.tab', function(e) {
    var target = $(e.target).attr('href');
    setInitialFocus(target, false);
  });

  var goToStep = function(stepNum) {
    vm.currentStep = stepNum;

    Vue.nextTick(function() {
      setInitialFocus($('.step-slide:eq(' + stepNum + ')'), true);
    });
  };

  var loadingIcon = function(type) {
    $('#loading-overlay .loading-status-icon').hide();
    $('#loading-' + type).show();

    if (type == 'complete') {
      $('.loader', $('#loading-overlay')).addClass('done');
    }
    else if (type == 'error') {
      $('.loader', $('#loading-overlay')).addClass('error');
      $('#error-actions-wrapper').show();
    }
  };

  var resetDatabaseForm = function() {
    $('#step-database-alert').hide();
    $('#database-connect-fields-wrapper').show();
    $('#database-after-connect').hide();
    $('#advanced-database').hide();
    $('#setup-database').text('Test Connection');
  };

  var resetAllTheThings = function() {
    $('#status').text('Cleaning up...');
    $('input').val('');
    $('.step-current-settings').hide();
    resetDatabaseForm();

    goToStep(0);

    setTimeout(function() {
      $('#loading-overlay').hide();
      $('.loader', $('#loading-overlay')).removeClass('done error');
      $('#post-install-actions-wrapper').hide();
      $('#error-actions-wrapper').hide();
    }, 500);
  };

  $('.external-link').click(function(e) {
    e.preventDefault();
    shell.openExternal($(this).attr('href'));
  });

  $('.step-back').click(function(e) {
    goToStep($(this).data('step-target'));
    return false;
  });

  $('#continue-directory-trigger').click(function(e) {
    goToStep(1);
    return false;
  });

  var $drop_target = $(document.body);
  var within_enter = false;

  $drop_target.bind('dragenter', function(e) {
    e.preventDefault();

    if (!$('#progress-step-0').hasClass('active') || $('body').hasClass('modal-open')) return false;

    within_enter = true;
    setTimeout(function() { within_enter = false; }, 0);

    $(this).addClass('js-dropzone');
    $('#drag-overlay').fadeIn(200, 'swing');
  });

  $drop_target.bind('dragover', function(e) {
    e.preventDefault();
  });

  $drop_target.bind('dragleave', function(e) {
    if (!$('#progress-step-0').hasClass('active') || $('body').hasClass('modal-open')) return false;

    if (! within_enter) {
      $(this).removeClass('js-dropzone');
      $('#drag-overlay').fadeOut(200, 'swing');
    }
    within_enter = false;
  });

  // Handle the actual drop effect
  $drop_target.bind('drop', function(e) {
    if (!$('#progress-step-0').hasClass('active') || $('body').hasClass('modal-open')) return false;

    $('#selected-directory-wrapper').hide();

    $(this).removeClass('js-dropzone');
    $('#drag-overlay').fadeOut(200, 'swing');
    within_enter = false;

    e.preventDefault();

    var dir = e.originalEvent.dataTransfer.items[0].webkitGetAsEntry();

    pathToWP = e.originalEvent.dataTransfer.files[0].path;

    if (dir.isDirectory) {
      wpDirectorySelected();

      // after dropping window loses focus, re-focus on app
      remote.getCurrentWindow().focus();
    }
    else {
      $('#step-directory-alert').show().html('<strong>' + pathToWP + '</strong> is not a directory');
    }
  });

  $('#select-directory-trigger').click(function(e) {
    var selected = dialog.showOpenDialog({properties: ['openDirectory']});

    if (selected !== undefined) {
      pathToWP = selected[0].toString();
      wpDirectorySelected();
    }
  });

  var wpDirectorySelected = function() {
    var wpFiles = glob.sync(pathToWP + "/wp-*");

    // check for existing WordPress install
    if (wpFiles.length) {
      $('#step-directory-alert').show().html('<strong>' + pathToWP + '</strong> contains files from a previous WordPress install.<br> Please select another folder or remove existing WordPress files.');
    }
    else {
     $('#step-directory-alert').hide();

     $('#selected-directory-wrapper').show();
     $('#selected-directory').text(pathToWP);

      // go to database step
      goToStep(1);

      // if stored database information exists automatically submit it
      if (dbDefaultsFound) {
        var autoSubmitDefaults = false;

        if (appSettings.get('dbUsername')) {
          $('#username').val(appSettings.get('dbUsername'));
          autoSubmitDefaults = true;
        }

        if (appSettings.get('dbPassword')) {
          $('#password').val(appSettings.get('dbPassword'));
        }

        if (appSettings.get('dbHostname')) {
          $('#hostname').val(appSettings.get('dbHostname'));
        }

        if (appSettings.get('dbPort')) {
          $('#port').val(appSettings.get('dbPort'));
        }

        if (autoSubmitDefaults) {
          $('#setup-database').trigger('click');
        }

        dbDefaultsFound = false;
      }
    }
  };

  // section toggles
  $('.section-toggle-content').hide();
  $('.section-toggle').click(function(e) {
    var target = $(this).attr('href');

    $('.fa', $(this)).toggleClass('fa-plus').toggleClass('fa-minus');
    $(target).slideToggle(250).trigger('displaying');

    return false;
  });

  // trigger database setup
  $('#step-database-form').submit(function(e) {
    if (validateDatabaseFields() !== true) {
      if ($('#database').val() !== '') {
        dbHasWPTables();
      }
      else {
        $('#setup-database').html('<i class="fa fa-exchange"></i> Connecting...').attr('disabled', 'disabled');
        dbSetup();
      }
    }

    return false;
  });

  $('#table_prefix').change(function() {
    $('#table_prefix').siblings('span').remove();
    $('#table_prefix').parent().removeClass('has-error has-feedback');
  });

  function validateDatabaseFields() {
    var failedValidation = false;

    if ($('#username').val() == '') {
      $('#username').after('<span class="fa fa-exclamation form-control-feedback" aria-hidden="true"></span><span class="sr-only">(error)</span>');
      $('#username').parent().addClass('has-error has-feedback');
      $('#username').focus();
      failedValidation = true;
    }
    else {
      $('#username').siblings('span').remove();
      $('#username').parent().removeClass('has-error has-feedback');
    }

    // if we're connected check that database is filled in
    if ($('#database-after-connect').is(':visible')) {
      if ($('#database').val() == '') {
        $('#database').parent().addClass('has-error has-feedback');
        failedValidation = true;
      }
      else {
        $('#database').siblings('span').remove();
        $('#database').parent().removeClass('has-error has-feedback');
      }
    }

    return failedValidation;
  }

  function dbHasWPTables() {
    // reset fields state
    $('#database').parent().removeClass('has-error');

    $('#table_prefix').siblings('span').remove();
    $('#table_prefix').parent().removeClass('has-error has-feedback');

    $('#step-database-alert').hide();

    // if database is new no need to check tables
    if (!checkDatabaseExists($('#database').val())) {
      // go to WordPress step
      goToStep(2);
      $('#title').focus();
    }
    else {
      if ($('#table_prefix').val() == '') {
        $('#advanced-database').hide();
      }

      // set up config
      var username = $('#username').val(),
          password = $('#password').val(),
          hostname = $('#hostname').val() ? $('#hostname').val() : '127.0.0.1',
          port = $('#port').val() ? $('#port').val() : 3306,
          database = $('#database').val(),
          prefix = $('#table_prefix').val() ? $('#table_prefix').val() : 'wp_';

      var checkWPTablesProcess = spawn(pathToBin, [pathToDBCLI, "--run=findTables", '--user=' + username, '--pass=' + password, '--host=' + hostname + ':' + port, '--db=' + database, '--search=' + prefix]);

      checkWPTablesProcess.stderr.on("data", function(data) {
        $('#step-database-alert').show().html("Could not access database interface");
      });

      checkWPTablesProcess.stdout.on("data", function(data) {
        var result = $.parseJSON(data);

        if (result.status == "success") {
          if (result.data.length == 0) {
            // go to WordPress step
            goToStep(2);
            $('#title').focus();
          }
          else {
            $('#database').parent().addClass('has-error');

            $('#table_prefix').after('<span class="fa fa-exclamation form-control-feedback" aria-hidden="true"></span><span class="sr-only">(error)</span>');
            $('#table_prefix').parent().addClass('has-error has-feedback');

            $('#step-database-alert').show().html('Existing WordPress tables found in selected database<br><small>Either select a different database or change the Table Prefix</small>');

            $('#advanced-database').show();

            $('#table_prefix').focus();
          }
        }
        else {
          $('#setup-database').focus();
        }
      });
    }
  }

  function checkDatabaseExists(dbName) {
    for (var i = 0, l = databases.length; i < l; i++) {
      var entry = databases[i];

      if (entry.id == dbName) {
        return true;
      }
    }

    return false;
  }

  function dbGetCharsets() {
    // set up config
    var username = $('#username').val(),
        password = $('#password').val(),
        hostname = $('#hostname').val() ? $('#hostname').val() : '127.0.0.1',
        port = $('#port').val() ? $('#port').val() : 3306,
        database = $('#database').val();

    var getCharsetsProcess = spawn(pathToBin, [pathToDBCLI, "--run=listCharacterSets", '--user=' + username, '--pass=' + password, '--host=' + hostname + ':' + port, '--db=' + database]);

    getCharsetsProcess.stderr.on("data", function(data) {
      $('#step-database-alert').show().html("Could not access database interface");
    });

    getCharsetsProcess.stdout.on("data", function(data) {
      var result = $.parseJSON(data);

      if (result.status == "success") {
        var charsets = [],
            defaultCollations = {};

        for (var i = 0, l = result.data.length; i < l; i++) {
          var charset = result.data[i],
              text = charset.Charset + ' (' + charset.Description + ')';

          charsets.push({id: charset.Charset, text: text});
          defaultCollations[charset.Charset] = charset['Default collation'];
        }

        charsets.sort(function(a, b) {
          var aID = a.id,
              bID = b.id;

          if (aID < bID)
            return -1

          if (aID > bID)
            return 1

          return 0;
        });

        // remove previous instances if connecting to a different database
        $('#charset').select2('destroy');

        $('#charset').select2({
          selectOnBlur: true,
          allowClear: true,
          multiple: false,
          placeholder: "Select a Character Set",
          data: charsets
        }).on('change', function(e) {
          if (e.val) {
            var getCharsetsProcess = spawn(pathToBin, [pathToDBCLI, "--run=listCollations", '--user=' + username, '--pass=' + password, '--host=' + hostname + ':' + port, '--db=' + database, '--search=' + e.val]);

            getCharsetsProcess.stderr.on("data", function(data) {
              $('#step-database-alert').show().html("Could not access database interface");
            });

            getCharsetsProcess.stdout.on("data", function(data) {
              var result = $.parseJSON(data);

              if (result.status == "success") {
                $('#collation').select2('destroy');

                var collations = [];

                for (var i = 0, l = result.data.length; i < l; i++) {
                  var collation = result.data[i];

                  collations.push({id: collation.Collation, text: collation.Collation});
                }

                $('#collation').select2({
                  selectOnBlur: true,
                  multiple: false,
                  placeholder: "Select a Collation",
                  data: collations
                }).val(defaultCollations[e.val]).trigger('change');
              }
            });
          }
          else {
            $('#collation').select2('destroy').val('');
          }
        });
      }
      else {
        var errorText = "Could not retrieve charset list";

        if (result.status == "error") {
          errorText = result.message;
        }

        $('#step-database-alert').show().html(errorText);
      }
    });
  }

  $('#database-after-connect').hide();

  function dbSetup() {
    if (!$('#database-after-connect').is(':visible')) {
      resetDatabaseForm();
    }

    // set up config
    var username = $('#username').val(),
        password = $('#password').val(),
        hostname = $('#hostname').val() ? $('#hostname').val() : '127.0.0.1',
        port = $('#port').val() ? $('#port').val() : 3306;

    // query for database list
    var getDatabasesProcess = spawn(pathToBin, [pathToDBCLI, "--run=listDatabases", '--user=' + username, '--pass=' + password, '--host=' + hostname + ':' + port]);

    getDatabasesProcess.stderr.on("data", function(data) {
      $('#step-database-alert').show().html("Could not access database interface");
      console.log(data.toString());
    });

    getDatabasesProcess.stdout.on("data", function(data) {
      var result = $.parseJSON(data);

      if (result.status == "success") {
        databases = [];

        for (var i = 0, l = result.data.length; i < l; i++) {
          var dbname = result.data[i];

          databases.push({id: dbname.Database, text: dbname.Database});
        }

        // remove previous instances if connecting to a different database
        $('#database').select2('destroy');

        $('#database').select2({
          selectOnBlur: true,
          multiple: false,
          placeholder: "Select a database or enter new database name",
          data: databases,
          createSearchChoice: function(term, data) {
            if ($(data).filter(function() {
              return this.text.localeCompare(term) === 0;
            }).length === 0) {
              return {id:term, text:term};
            }
          }
        }).on('change', function(e) {
          $('#setup-database').focus();

          if (e.val) {
            $('#database').parent().removeClass('has-error has-feedback');

            $('#table_prefix').siblings('span').remove();
            $('#table_prefix').parent().removeClass('has-error has-feedback');

            // check if it's an existing or new database and handle accordingly
            if (checkDatabaseExists(e.val)) {
              $('#advanced-database-charset-fields').hide();
            }
            else {
              $('#advanced-database-charset-fields').show();

              // get charsets
              dbGetCharsets();
            }
          }
        });

        if (!$('#database-after-connect').is(':visible')) {
          $('#step-database-alert').hide();

          $('#database-after-connect').slideDown(500, 'swing', function() {
            $('#database').select2('open');
          });

          $('#setup-database').text('Confirm Database Settings').removeAttr('disabled');

          $('#database-connect-fields-wrapper').slideUp(500, 'swing');
          $('#selected-database').text($('#username').val() + '@' + hostname + ':' + port);
          $('#selected-database-wrapper').slideDown(500, 'swing');
        }
      }
      else {
        var errorText = "Could not retrieve database list";

        if (result.status == "error") {
          errorText = result.message;
          console.log(result.message);

          if (result.message == "Connection refused") {
            errorText += '<br><small>Verify that your database allows network connections,<br> and that the <strong>Hostname</strong> and <strong>Port Number</strong> match your settings</small>';
          }
        }

        $('#database-after-connect').hide();
        $('#setup-database').text('Test Connection').removeAttr('disabled');
        $('#step-database-alert').show().html(errorText);
      }
    });
  }

  $('#change-database-details').click(function(e) {
    $('#step-database-alert').hide();
    $('#database-after-connect').hide();
    $('#database').val('').select2('destroy');
    $('#table_prefix').val('');
    $('#database-connect-fields-wrapper').slideDown(500, 'swing');
    $('#selected-database-wrapper').slideUp(500, 'swing');
    $('#setup-database').text('Test Connection');

    return false;
  });

  $('#advancedWP').bind('displaying', function() {
    var wpVersion = null;

    // get current WP version
    $.ajax({
      url: "https://api.wordpress.org/core/version-check/1.7/"
    })
    .done(function(data) {   
      wpVersion = data.offers[0].current;

      // get languages available for current version
      $.ajax({
        method: "GET",
        url: "https://api.wordpress.org/translations/core/1.0",
        data: { 
          version: wpVersion
        }
      })
      .done(function(data) {
        if (data.translations.length) {
          var languages = [];

          $.each(data.translations, function(i, item) {
            var label = item.english_name;

            if (item.english_name !== item.native_name) {
              label += ' : ' + item.native_name;
            }

            languages.push({
              id: item.language,
              text: label
            });
          });
        
          $('#language').prop('disabled', false).attr('placeholder', 'Select a Language').select2({
            selectOnBlur: true,
            allowClear: true,
            multiple: false,
            placeholder: "Select a Language",
            data: languages
          }).on('change', function(e) {
            vm.language = e.val;
          });
        }
      })
      .fail(function() {
        $('#language').after('<span class="fa fa-exclamation form-control-feedback" aria-hidden="true"></span><span class="sr-only">(error)</span>');
        $('#language').after('<span id="languageDesc" class="help-block">Could not retrieve languages list, please try again later</span>').parent().addClass('has-error has-feedback');
      });
    });
  });

  $('#step-wordpress-form').submit(function(e) {
    if (validateWordPressFields() !== true) {
      goToStep(3);
    }

    return false;
  });

  function validateWordPressFields() {
    var failedValidation = false;

    if ($('#title').val() == '') {
      $('#title').after('<span class="fa fa-exclamation form-control-feedback" aria-hidden="true"></span><span class="sr-only">(error)</span>');
      $('#title').parent().addClass('has-error has-feedback');
      failedValidation = true;
    }
    else {
      $('#title').siblings('span').remove();
      $('#title').parent().removeClass('has-error has-feedback');
    }

    if ($('#url').val() == '') {
      $('#url').after('<span class="fa fa-exclamation form-control-feedback" aria-hidden="true"></span><span class="sr-only">(error)</span>');
      $('#url').parent().addClass('has-error has-feedback');
      failedValidation = true;
    }
    else if (!validator.isURL($('#url').val(), { protocols: ['http','https'], require_tld: false, require_protocol: true, require_valid_protocol: true })) {
      $('#url').after('<span class="fa fa-exclamation form-control-feedback" aria-hidden="true"></span><span class="sr-only">(error)</span>');
      $('#url').parent().addClass('has-error has-feedback');
      failedValidation = true;
    }
    else {
      $('#url').siblings('span').remove();
      $('#url').parent().removeClass('has-error has-feedback');
    }

    if ($('#admin_email').val() == '') {
      $('#admin_email').after('<span class="fa fa-exclamation form-control-feedback" aria-hidden="true"></span><span class="sr-only">(error)</span>');
      $('#admin_email').parent().addClass('has-error has-feedback');
      failedValidation = true;
    }
    else if (!validator.isEmail($('#admin_email').val())) {
      $('#admin_email').after('<span class="fa fa-exclamation form-control-feedback" aria-hidden="true"></span><span class="sr-only">(error)</span>');
      $('#admin_email').parent().addClass('has-error has-feedback');
      failedValidation = true;
    }
    else {
      $('#admin_email').siblings('span').remove();
      $('#admin_email').parent().removeClass('has-error has-feedback');
    }

    if ($('#admin_username').val() == '') {
      $('#admin_username').after('<span class="fa fa-exclamation form-control-feedback" aria-hidden="true"></span><span class="sr-only">(error)</span>');
      $('#admin_username').parent().addClass('has-error has-feedback');
      failedValidation = true;
    }
    else {
      $('#admin_username').siblings('span').remove();
      $('#admin_username').parent().removeClass('has-error has-feedback');
    }

    if ($('#admin_password').val() == '') {
      $('#admin_password').after('<span class="fa fa-exclamation form-control-feedback" aria-hidden="true"></span><span class="sr-only">(error)</span>');
      $('#admin_password').parent().addClass('has-error has-feedback');
      failedValidation = true;
    }
    else {
      $('#admin_password').siblings('span').remove();
      $('#admin_password').parent().removeClass('has-error has-feedback');
    }

    return failedValidation;
  }

  $('#step-bundles-form').submit(function(e) {
    return false;
  });

  $('#save-bundle-begin-install').click(function(e) {
    // store bundles
    appSettings.setBundle('default', 'plugins', JSON.stringify(vm.plugins));
    appSettings.setBundle('default', 'themes', JSON.stringify(vm.themes));

    displayInstallStatus();

    return false;
  });

  $('#bundle-begin-install').click(function(e) {
    displayInstallStatus();

    return false;
  });

  function displayInstallStatus() {
    loadingIcon('download');
    $('#loading-overlay').show();

    $('#status').text('Beginning installation...');

    getWPFiles();
  }

  function getWPFiles() {
    // download files
    var dlparams = [pathToWPCLI, "core", "download", "--path=" + pathToWP],
        child = spawn(pathToBin, dlparams);

    child.stderr.on("data", function(data) {
      $('#status').text(data.toString());
      errorDump += '%0A%0A' + data.toString();
    });

    child.stdout.on("data", function(data) {
      $('#status').text('Retrieving WordPress files...');
      errorDump += '%0A%0A' + data.toString();
    });

    // files are downloaded
    child.on("close", function(code) {
      setupWPDatabase();
    });
  }

  function setupWPDatabase() {
    loadingIcon('database');

    $('#status').text("Verifying database...");

    var dbname = $('#database').val(),
        dbuser = $('#username').val(),
        dbpass = $('#password').val(),
        dbhost = $('#hostname').val() ? $('#hostname').val() : '127.0.0.1',
        dbport = $('#port').val() ? $('#port').val() : 3306,
        charset = $('#charset').val(),
        collation = $('#collation').val();

    // create database if it doesn't exist
    if (!checkDatabaseExists(dbname)) {
      var getDatabasesProcess = spawn(pathToBin, [pathToDBCLI, "--run=createDatabase", '--user=' + dbuser, '--pass=' + dbpass, '--host=' + dbhost + ':' + dbport, '--db=' + dbname, '--charset=' + charset, '--collate=' + collation]);

      getDatabasesProcess.stderr.on("data", function(data) {
        loadingIcon('error');
        $('#status').text("Could not access database interface");
        errorDump += '%0A%0ASetup WP DB: ' + data.toString();
      });

      getDatabasesProcess.stdout.on("data", function(data) {
        var result = $.parseJSON(data);

        errorDump += '%0A%0A' + data.toString();

        if (result.status == "success") {
          createWPConfig();
        }
        else {
          var errorText = "Could not create database";

          if (result.status == "error") {
            errorText += ": " + result.message;
          }

          loadingIcon('error');
          $('#status').text(errorText);
          errorDump += '%0A%0ASetup WP DB Create: ' + errorText;
        }
      });
    }
    else {
      createWPConfig();
    }
  }

  function createWPConfig() {
    $('#status').text("Creating WP config...");

    var dbname = $('#database').val(),
        dbuser = $('#username').val(),
        dbpass = $('#password').val(),
        dbhost = $('#hostname').val() ? $('#hostname').val() : '127.0.0.1',
        dbport = $('#port').val() ? $('#port').val() : 3306,
        prefix = $('#table_prefix').val(),
        charset = $('#charset').val(),
        collation = $('#collation').val();

    var dbparams = [pathToWPCLI, "core", "config", "--skip-check", "--path=" + pathToWP, "--dbname=" + dbname, "--dbuser=" + dbuser];

    if (dbpass !== '') {
      dbparams.push("--dbpass=" + dbpass);
    }

    if (dbhost !== '') {
      var fullhost = dbhost;

      if (dbport !== 3306) {
        fullhost += ":" + dbport;
      }

      dbparams.push("--dbhost=" + fullhost);
    }

    if (prefix !== '') {
      dbparams.push("--dbprefix=" + prefix);
    }

    if (charset !== '') {
      dbparams.push("--dbcharset=" + charset);
    }

    if (collation !== '') {
      dbparams.push("--dbcollate=" + collation);
    }

    // create WP config
    var createWPConfigProcess = spawn(pathToBin, dbparams);

    createWPConfigProcess.stderr.on("data", function(data) {
      loadingIcon('error');
      $('#status').text("Could not create WP config");
      errorDump += '%0A%0ACreate WP Config: ' + data.toString();
    });

    createWPConfigProcess.stdout.on("data", function(data) {
      $('#status').text(data.toString());
      errorDump += '%0A%0A' + data.toString();
    });

    // config complete, go to next step
    createWPConfigProcess.on("close", function(code) {
      if (code == 0) {
        completeWPSetup();
      }
      else {
        loadingIcon('error');
        $('#status').text("Could not confirm WP config settings");
        errorDump += '%0A%0ACreate WP Config Settings: ' + code.toString();
      }
    });
  }

  // Themes install
  function installWPThemes(index) { 
    var numThemes = vm.themes.length,
        currentNum = index + 1;

    loadingIcon('themes');
    $('#status').text('Installing theme (' + currentNum + '/' + numThemes + ')...');

    var themeParams = [pathToWPCLI, "theme", "install", vm.themes[index].location, "--path=" + pathToWP];

    if (vm.themes[index].active) {
      themeParams.push('--activate');
    }

    var wpThemeInstall = spawn(pathToBin, themeParams);

    wpThemeInstall.stderr.on("data", function(data) {
      errorDump += '%0A%0ACould not install theme: ' + data.toString();
    });

    wpThemeInstall.on("close", function(code) {
      if (index < numThemes - 1) {
        installWPThemes(index + 1);
      }
      else {
        // update installed themes
        $('#status').text('Updating themes...'); 

        var updateThemes = spawn(pathToBin, [pathToWPCLI, "theme", "update", "--all", "--path=" + pathToWP]);

        updateThemes.stderr.on("data", function(data) {
          errorDump += '%0A%0ACould not update themes: ' + data.toString();
        });
        
        updateThemes.on("close", function(code) {
          if (vm.plugins.length) {
            installWPPlugins(0);
          }
          else if (vm.language.length) {
            installWPLanguage();
          }
          else {
            displayFinalScreen();
          }
        });
      }
    });
  }

  // Plugins install
  function installWPPlugins(index) {
    var numPlugins = vm.plugins.length,
        currentNum = index + 1;

    loadingIcon('plugins');
    $('#status').text('Installing plugin (' + currentNum + '/' + numPlugins + ')...');

    var pluginParams = [pathToWPCLI, "plugin", "install", vm.plugins[index].location, "--path=" + pathToWP];

    if (vm.plugins[index].active) {
      pluginParams.push('--activate');
    }

    var wpPluginInstall = spawn(pathToBin, pluginParams);

    wpPluginInstall.stderr.on("data", function(data) {
      errorDump += '%0A%0ACould not install plugin: ' + data.toString();
    });
  
    wpPluginInstall.on("close", function(code) {
      if (index < numPlugins - 1) {
        installWPPlugins(index + 1);
      }
      else {
        // update installed plugins
        $('#status').text('Updating plugins...'); 

        var updatePlugins = spawn(pathToBin, [pathToWPCLI, "plugin", "update", "--all", "--path=" + pathToWP]);

        updatePlugins.stderr.on("data", function(data) {
          errorDump += '%0A%0ACould not update plugins: ' + data.toString();
        });
        
        updatePlugins.on("close", function(code) {
          if (vm.language.length) {
            installWPLanguage();
          }
          else {
            displayFinalScreen();
          }
        });
      }
    });
  }

  // Language Install
  function installWPLanguage() {
    if (vm.language.length) {
      loadingIcon('language');
      
      var data = $('#language').select2('data');
      $('#status').text("Installing language - " + data.text + "...");

      var wpLanguageInstall = spawn(pathToBin, [pathToWPCLI, "core", "language", "install", vm.language, "--activate", "--path=" + pathToWP]);

      wpLanguageInstall.stderr.on("data", function(data) {
        errorDump += '%0A%0ACould not install language: ' + data.toString();
      });

      wpLanguageInstall.on("close", function(code) {
        displayFinalScreen();
      });
    }
  }

  function completeWPSetup() {
    // completed installation
    var url = $('#url').val(),
        title = $('#title').val(),
        admin_user = $('#admin_username').val(),
        admin_pass = $('#admin_password').val(),
        admin_email = $('#admin_email').val();

    loadingIcon('wordpress');
    $('#status').text("Setting up WordPress...");

    var wpparams = [pathToWPCLI, "core", "install", "--path=" + pathToWP, "--url=" + url, "--title=" + title, "--admin_user=" + admin_user, "--admin_password=" + admin_pass, "--admin_email=" + admin_email];

    var wpConfigSetupProcess = spawn(pathToBin, wpparams);

    wpConfigSetupProcess.stderr.on("data", function(data) {
      loadingIcon('error');
      $('#status').text('Could not complete WordPress installation');
      errorDump += '%0A%0AComplete WP Setup: ' + data.toString();
    });

    wpConfigSetupProcess.stdout.on("data", function(data) {
      var msg = data.toString();

      errorDump += '%0A%0A' + data.toString();

      if (msg.indexOf('Success: WordPress installed successfully') > -1) {
        if (vm.isProVersion && vm.themes.length) {
          installWPThemes(0);
        }
        else if (vm.isProVersion && vm.plugins.length) {
          installWPPlugins(0);
        }
        else if (vm.language.length) {
          installWPLanguage();
        }
        else {
          displayFinalScreen();
        }
      }
      else {
        loadingIcon('error');
        $('#status').text('Could not complete WordPress installation');
        errorDump += '%0A%0AComplete WP Setup Install: ' + msg;
      }
    });
  }

  function displayFinalScreen() {
    loadingIcon('complete');
    $('#status').text('WordPress Installed Successfully');

    $('#open-new-site-browser').on('click', function() {
      shell.openExternal($('#url').val());
      return false;
    });

    $('#open-new-site-folder').on('click', function() {
      shell.openItem(pathToWP);
      return false;
    });

    $('#open-new-install').on('click', function() {
      resetAllTheThings();
      return false;
    });

    $('#post-install-actions-wrapper').show();
  }

  // default database config settings
  if (appSettings.get('dbUsername')) {
    $('#defaultDBUser').val(appSettings.get('dbUsername'));
    dbDefaultsFound = true;
  }

  if (appSettings.get('dbPassword')) {
    $('#defaultDBPass').val(appSettings.get('dbPassword'));
    dbDefaultsFound = true;
  }

  if (appSettings.get('dbHostname')) {
    $('#defaultDBHost').val(appSettings.get('dbHostname'));
    dbDefaultsFound = true;
  }

  if (appSettings.get('dbPort')) {
    $('#defaultDBPort').val(appSettings.get('dbPort'));
    dbDefaultsFound = true;
  }

  // default wordpress config settings
  if (appSettings.get('wpUsername')) {
    $('#defaultWPUser').val(appSettings.get('wpUsername'));
    $('#admin_username').val(appSettings.get('wpUsername'));
  }

  if (appSettings.get('wpPassword')) {
    $('#defaultWPPass').val(appSettings.get('wpPassword'));
    $('#admin_password').val(appSettings.get('wpPassword'));
  }

  if (appSettings.get('wpEmail')) {
    $('#defaultWPEmail').val(appSettings.get('wpEmail'));
    $('#admin_email').val(appSettings.get('wpEmail'));
  }

  // save the default app settings
  $('#saveDefaultsSettings').click(function(e) {
    $('#settings-default-alert').hide();
    $('#settings-default-success').hide();

    // database
    appSettings.set('dbUsername', $('#defaultDBUser').val());
    appSettings.set('dbPassword', $('#defaultDBPass').val());
    appSettings.set('dbHostname', $('#defaultDBHost').val());
    appSettings.set('dbPort', $('#defaultDBPort').val());

    // wordpress
    appSettings.set('wpUsername', $('#defaultWPUser').val());
    appSettings.set('wpPassword', $('#defaultWPPass').val());
    appSettings.set('wpEmail', $('#defaultWPEmail').val());

    if ($('#admin_username').val() == '') {
      $('#admin_username').val($('#defaultWPUser').val());
    }

    if ($('#admin_password').val() == '') {
      $('#admin_password').val($('#defaultWPPass').val());
    }

    if ($('#admin_email').val() == '') {
      $('#admin_email').val($('#defaultWPEmail').val());
    }

    dbDefaultsFound = true;

    $('#settings-defaults-success').html('<strong>Changes successfully saved</strong>').show();
  });

  // select path
  if (appSettings.get('phpBinPath')) {
    $('#phpBinaryPath').val(appSettings.get('phpBinPath'));
  }

  $('#phpBinaryPathSelect').click(function(e) {
    var selected = dialog.showOpenDialog({properties: ['openFile']});

    if (selected !== undefined) {
      $('#phpBinaryPath').val(selected[0].toString());
    }

    return false;
  });

  $('#advancedModal, #defaultsModal').on('hidden.bs.modal', function() {
    $('.alert-success', $(this)).hide();
  });

  // save the advanced app settings
  $('#saveAdvancedSettings').click(function(e) {
    $('#settings-advanced-alert').hide();
    $('#settings-advanced-success').hide();
    $('#phpBinaryPathWrapper').removeClass('has-error');

    var phpBinPath = $('#phpBinaryPath').val();

    if (phpBinPath !== '') {
      if (fs.existsSync(phpBinPath)) {
        // check if the PHP binary is 5.3.0 or greater
        // versionCompare('5.3.0', {php -v}) <= 0

        try {
          // check if we can run the WPCLI script
          var phpBinTestProcess = spawn(phpBinPath, [pathToWPCLI, "--version"]);

          phpBinTestProcess.stderr.on("data", function(data) {
            // could not execute file
            $('#settings-advanced-alert').html('<strong>Error accessing binary</strong><br> There was an error attempting to run the selected binary').show();
            $('#phpBinaryPathWrapper').addClass('has-error');
          });

          phpBinTestProcess.stdout.on("data", function(data) {
            var msg = data.toString();

            if (msg.indexOf('WP-CLI') > -1) {
              // save settings
              appSettings.set('phpBinPath', phpBinPath);

              $('#settings-advanced-success').html('<strong>Changes successfully saved</strong>').show();
            }
            else {
              // could not run script
              $('#settings-advanced-alert').html('<strong>Selected binary invalid</strong><br> The selected binary cannot run the installer script').show();
              $('#phpBinaryPathWrapper').addClass('has-error');
            }
          });
        }
        catch(e) {
          $('#settings-advanced-alert').html('<strong>Could not access selected binary</strong><br> There was an error attempting to run the selected binary').show();
          $('#phpBinaryPathWrapper').addClass('has-error');
        }
      }
      else {
        $('#settings-advanced-alert').html('<strong>File does not exist</strong><br> No file found at specified location').show();
        $('#phpBinaryPathWrapper').addClass('has-error');
      }
    }
    else {
      // reset binary if empty
      if (appSettings.get('phpBinPath')) {
        appSettings.set('phpBinPath', '');

        pathToBin = defaultPathToBin;

        $('#settings-advanced-success').html('<strong>Changes successfully saved</strong>').show();
      }
    }
  });

  $('#send-error-report').on('click', function() {
    window.location.href = "mailto:support@wpexpress.io?subject=WP%20Express%20Error%20Report&body=%0A%0A%0A%0A--------------------------------%0A%0ADEBUG INFO:%0A%0APlatform: " + process.platform + " (" + process.arch + ")" + "%0A%0A" + "Version: " + remote.require('app').getVersion() + errorDump;
    return false;
  });

  $('#restart-install').on('click', function() {
    resetAllTheThings();
    return false;
  });

  // activate license key function
  $('#activateLicenseKey').click(function(e) {
    var licenseKey = $('#licenseKey').val();

    $('#licenseKeyDesc').text('Your License Activation Key').parent().removeClass('has-error');
    $('.form-control-feedback, .sr-only, #licenseKeySupport', '#licenseModal').remove();

    if (licenseKey !== '') {
      vm.checkingLicenseKey = true;

      $.ajax({
        method: "POST",
        url: "https://api.gumroad.com/v2/licenses/verify",
        data: { 
          product_permalink: 'wpexpress', 
          license_key: licenseKey 
        }
      })
      .done(function(data) {        
        if (data.success == true) {
          if (data.purchase.chargebacked == true || data.purchase.refunded == true) {
            $('#licenseKey').focus().after('<span class="fa fa-exclamation form-control-feedback" aria-hidden="true"></span><span class="sr-only">(error)</span>');

            $('#licenseKeyDesc').html('License key has been deactivated due to refund or chargeback').after('<span class="fa fa-exclamation form-control-feedback" aria-hidden="true"></span><span class="sr-only">(error)</span><span id="licenseKeySupport">If you believe this is an error please <a href="mailto:support@wpexpress.io">contact support</a>').parent().addClass('has-error has-feedback');
          }
          else if (data.success) {
            appSettings.set('licenseKey', licenseKey);
            vm.licenseKey = licenseKey;

            appSettings.set('licenseEmail', data.purchase.email);
            vm.licenseEmail = data.purchase.email;

            if (data.purchase.full_name !== undefined) {
              appSettings.set('licenseName', data.purchase.full_name);
              vm.licenseName = data.purchase.full_name;
            }

            vm.isProVersion = true;
          }
        }
        else {
          $('#licenseKey').focus().after('<span class="fa fa-exclamation form-control-feedback" aria-hidden="true"></span><span class="sr-only">(error)</span>');

          $('#licenseKeyDesc').html('Invalid license key').after('<span id="licenseKeySupport">If you believe this is an error please <a href="mailto:support@wpexpress.io">contact support</a>').parent().addClass('has-error has-feedback');
        }
      })
      .fail(function() {
        $('#licenseKey').focus().after('<span class="fa fa-exclamation form-control-feedback" aria-hidden="true"></span><span class="sr-only">(error)</span>');

        $('#licenseKeyDesc').html('Could not connect to license verification server, please try again later').after('<span id="licenseKeySupport">If you continue to receive this error please <a href="mailto:support@wpexpress.io">contact support</a>').parent().addClass('has-error has-feedback');
      })
      .always(function() {
        vm.checkingLicenseKey = false;
      });
    }
    else {
      $('#licenseKey').focus().after('<span class="fa fa-exclamation form-control-feedback" aria-hidden="true"></span><span class="sr-only">(error)</span>');
      $('#licenseKeyDesc').text('License key is required').parent().addClass('has-error has-feedback');
    }
  });

  // Bundles 
  $('body').tooltip({
    selector: '[data-toggle=tooltip]',
    container: 'body',
    trigger: 'hover'
  });

  // Themes
  var themeSearchTimeout = null;

  function searchWPThemesDir(str) {
    $('#themeDirectorySearchHelpBlock').removeClass('text-danger').text('').hide();

    var searchThemesProcess = spawn(pathToBin, [pathToWPAPI, "--run=getThemes", '--per_page=7', '--page=1', '--search=' + str]);

    searchThemesProcess.stderr.on("data", function(data) {
      vm.wpthemes = [];
      $('#themeDirectorySearchHelpBlock').addClass('text-danger').text('Could not retrieve themes list from WordPress directory').show();

      errorDump += '%0A%0ACould not retrieve themes list: ' + data.toString();

      vm.loadingWPThemes = false;
    });

    searchThemesProcess.stdout.on("data", function(data) {
      var data = $.parseJSON(data);

      if (data.themes.length) {
        vm.wpthemes = [];

        $.each(data.themes, function(i, item) {
          vm.wpthemes.push({
            name: item.name,
            slug: item.slug,
            version: item.version,
            author: item.author
          });
        });
      }
      else {
        $('#themeDirectorySearchHelpBlock').html('No matching themes found for <strong>' + str + '</strong>').show();
      }

      vm.loadingWPThemes = false;
    });
  }

  $('#themeDirectorySearch').keyup(function() {
    var themeSearchTermLength = $(this).val().length;

    if (themeSearchTermLength >= 2) {
      clearTimeout(themeSearchTimeout);
      var $target = $(this);

      themeSearchTimeout = setTimeout(function() {
        vm.loadingWPThemes = true;
        searchWPThemesDir($target.val()); 
      }, 500); 
    }
    else if (themeSearchTermLength == 0) {
      vm.wpthemes = [];
      $('#themeDirectorySearchHelpBlock').hide();
    }
  });

  // Handle the actual drop effect
  $('#themeDropTarget').bind('drop', function(e) {
    e.preventDefault();

    if (e.originalEvent.dataTransfer.files.length) {
      var themeFiles = e.originalEvent.dataTransfer.files;

      for (var i in themeFiles) {
        var themeFilePath = themeFiles[i].path;

        if (themeFilePath !== undefined && path.parse(themeFilePath).ext == '.zip' && !themeAlreadySelected(themeFilePath)) {
          vm.themes.push({
            type: 'file-zip-o',
            name: path.parse(themeFilePath).name,
            location: themeFilePath,
            tooltip: 'Theme will be copied from ' + themeFilePath,
            active: false
          });
        }
      }
    }
  });

  // Plugins
  var pluginSearchTimeout = null;

  function searchWPPluginsDir(str) {
    $('#pluginDirectorySearchHelpBlock').removeClass('text-danger').text('').hide();

    var searchPluginsProcess = spawn(pathToBin, [pathToWPAPI, "--run=getPlugins", '--per_page=7', '--page=1', '--search=' + str]);

    searchPluginsProcess.stderr.on("data", function(data) {
      vm.wpplugins = [];
      $('#themeDirectorySearchHelpBlock').addClass('text-danger').text('Could not retrieve plugins list from WordPress directory').show();

      errorDump += '%0A%0ACould not retrieve plugins list: ' + data.toString();

      vm.loadingWPPlugins = false;
    });

    searchPluginsProcess.stdout.on("data", function(data) {
      var data = $.parseJSON(data);

      if (data.plugins.length) {
        vm.wpplugins = [];

        $.each(data.plugins, function(i, item) {
          var formattedAuthor = '';

          if (item.author !== null && item.author.length > 0) {
            var authorText = item.author.match(/\<a.*\>(.*)\<\/a\>/);
            
            if (authorText !== null) {
              formattedAuthor = authorText;
            }
          }

          vm.wpplugins.push({
            name: item.name,
            slug: item.slug,
            version: item.version,
            author: formattedAuthor[1]
          });
        });
      }
      else {
        $('#pluginDirectorySearchHelpBlock').html('No matching plugins found for <strong>' + str + '</strong>').show();
      }

      vm.loadingWPPlugins = false;
    });
  }

  $('#pluginDirectorySearch').keyup(function() {
    var pluginSearchTermLength = $(this).val().length;

    if (pluginSearchTermLength >= 2) {
      clearTimeout(pluginSearchTimeout);
      var $target = $(this);

      pluginSearchTimeout = setTimeout(function() {
        vm.loadingWPPlugins = true;
        searchWPPluginsDir($target.val()); 
      }, 500); 
    }
    else if (pluginSearchTermLength == 0) {
      vm.wpplugins = [];
      $('#pluginDirectorySearchHelpBlock').hide();
    }
  });

  // Handle the actual drop effect
  $('#pluginDropTarget').bind('drop', function(e) {
    e.preventDefault();

    if (e.originalEvent.dataTransfer.files.length) {
      var pluginFiles = e.originalEvent.dataTransfer.files;

      for (var i in pluginFiles) {
        var pluginFilePath = pluginFiles[i].path;

        if (pluginFilePath !== undefined && path.parse(pluginFilePath).ext == '.zip' && !pluginAlreadySelected(pluginFilePath)) {
          vm.plugins.push({
            type: 'file-zip-o',
            name: path.parse(pluginFilePath).name,
            location: pluginFilePath,
            tooltip: 'Plugin will be copied from ' + pluginFilePath,
            active: true
          });
        }
      }
    }
  });

});

function themeAlreadySelected(location) {
  var themeFound = vm.themes.filter(function(theme) {
    return theme.location == location;
  });

  return themeFound.length > 0;
}

function pluginAlreadySelected(location) {
  var pluginFound = vm.plugins.filter(function(plugin) {
    return plugin.location == location;
  });

  return pluginFound.length > 0;
}

function isValidURL(url) {
  return validator.isURL(url, { require_protocol: true, require_valid_protocol: true });
}

// http://stackoverflow.com/a/6832721/3121495
function versionCompare(v1, v2, options) {
  var lexicographical = options && options.lexicographical,
      zeroExtend = options && options.zeroExtend,
      v1parts = v1.split('.'),
      v2parts = v2.split('.');

  function isValidPart(x) {
    return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
  }

  if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
    return NaN;
  }

  if (zeroExtend) {
    while (v1parts.length < v2parts.length) v1parts.push("0");
    while (v2parts.length < v1parts.length) v2parts.push("0");
  }

  if (!lexicographical) {
    v1parts = v1parts.map(Number);
    v2parts = v2parts.map(Number);
  }

  for (var i = 0; i < v1parts.length; ++i) {
    if (v2parts.length == i) {
      return 1;
    }

    if (v1parts[i] == v2parts[i]) {
      continue;
    }
    else if (v1parts[i] > v2parts[i]) {
      return 1;
    }
    else {
      return -1;
    }
  }

  if (v1parts.length != v2parts.length) {
    return -1;
  }

  return 0;
}