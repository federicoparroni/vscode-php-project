## Release Notes

### 2.2.0

* Removed deprecated `rootPath` and replaced it with `workspaceFolder`.
* `Address` and `ip` settings have been removed and replace with `args`. This will allow you to further customize your PHP configuration.
* Added variable support.

### 2.1.0

Fixed bug in newer VSCODE version where user would not get notifications about errors or other information. Also moved "Start" and "Stop" command to title menu with new icons. Context menu now should look cleaner and less cluttered.

### 2.0.2

Fixed a bug introduced with 2.0.1 patch. Sometimes when STDOUT and/or STDERR streams terminate prematurely or containt no newline, stopping server would result in having "PHP server stopped" on the same line. It should always be on a seperate line.

### 2.0.1

Fixed a bug where data stream from PHP server would sometimes end up on a new line.

### 2.0.0

Replaced `php-project.domainPrepend` and `php-project.domainAppend` settings with `php-project.launchOutputTemplate`.

### 1.1.1

Fixed a typo and changed gif order.

### 1.1.0

* Added `php-project.domainPrepend` and `php-project.domainAppend` settings
* Debug information is now shown if PHP server fails to start
* Fixed a bug where you could PHP start server for unsaved file
* Added "PHP server stoped." to be shown in output instead of information window

### 1.0.2

Fixed a typo in README (it's very late).

### 1.0.1

Fixed README demo gif.

### 1.0.0

Initial release of PHP Project.