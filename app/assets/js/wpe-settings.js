var wpeSettings = (function() {
	const jetpack = require('fs-jetpack');

	var wpeSettings = function() {
		this.configPath = remote.app.getPath('userData');
		this.configFile = 'settings.json';
		this.configFilePath = this.configPath + '/' + this.configFile;
		this.settings = {
			phpBinPath: '',
			dbUsername: '',
			dbPassword: '',
			dbHostname: '',
			dbPort: ''
		};
	};

	wpeSettings.prototype = {
		init: function() {
			var self = this;

			// create config file if not exists
			try {
				var settingsFile = jetpack.read(self.configFilePath, 'json');

				if (settingsFile == undefined) {
					jetpack.write(self.configFilePath, self.settings);
				}
			}
			catch (err) {
				jetpack.file(self.configFilePath, { content: '{}' })
			}

			// load existing settings
			this.loadSettings();
		},

		set: function(key, value) {
			this.settings[key] = value;
			this.saveSettings();
		},

		setBundle: function(name, type, data) {
			if (this.settings['bundles'] == undefined) {
				this.settings['bundles'] = {};
			}

			if (this.settings['bundles'][name] == undefined) {
				this.settings['bundles'][name] = {};
			}

			this.settings['bundles'][name][type] = JSON.parse(data);
			this.saveSettings();
		},

		loadSettings: function() {
			var self = this;
			self.settings = jetpack.read(this.configFilePath, 'json');
		},

		get: function(key) {
			if (this.settings[key] !== undefined) {
				return this.settings[key];
			}

			return false;
		},

		getBundle: function(name) {
			if (this.settings['bundles'] !== undefined && this.settings['bundles'][name] !== undefined) {
				return this.settings['bundles'][name];
			}

			return false;
		},

		getSettings: function() {
			return this.settings;
		},

		saveSettings: function() {
			jetpack.write(this.configFilePath, this.settings);
		}
	};

	return wpeSettings;
})();