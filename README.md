# WP Express

WordPress installer app built on Electron.

![WP Express screenshot](app/assets/images/screenshot.png "WP Express Start Screen")

## Installation

Run the following commands to download and install the dependencies for the application:

```
git clone https://github.com/ractoon/wp-express.git
cd wp-express
npm install
cd app
npm install
```

### Installation Description

After cloning, or downloading, the repository go into the directory you just created and run `npm install`. This will set up the Electron dependencies. 

Once the Electron dependencies are installed go into the `app` directory (`wp-express/app`) and run `npm install` once again. This installs the application specific dependencies.

### Windows

[Download PHP binaries](https://windows.php.net/download) (version 5.3.29 or later) and extract them into the `app/bin/win32/php` directory so the path to `php.exe` looks like `app/bin/win32/php/php.exe`

### OSX / Linux

[Download PHP binaries](http://php.net/downloads.php) (version 5.3.29 or later) and extract them into the `app/bin/osx` directory so the path to `php` looks like `app/bin/osx/php`

## Running the Application

In the main directory (`wp-express` if you followed the installation instructions above) run the following command to start the application:

```
npm run start
```

## Usage

Step by step instructions can be viewed at [https://www.wpexpress.io/](https://www.wpexpress.io/)