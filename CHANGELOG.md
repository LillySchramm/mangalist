# Changelog

## v1.3.0  - 19.11.2024

### Added

- Added 'Recent Additions' Filter. 
- Added AI grouping of books. 
- Implemented a rudimentary Bar Code Scanner for the web UI. This enables non-Android users to also add books by scanning their bar code. 
- Recently added books are now displayed as 'new' for 45 days after being added. 
- The public collection URL is now '/@\<username>'. 
### Changed

- The companion app now targets Android 14+. 
### Removed

- The '/u/\<username>' syntax for collection URLs has been removed. Old links will be automagically redirected to the new schema. 
### Fixed

- Fixed a few typos. 


## v1.2.4  - 16.9.2024

### Changed

- Dependency Updates 
- Security Updates 


## v1.2.3  - 8.4.2024

### Added

- Accounts which did not get activated are now being deleted after a week. 
- Added a language filter to the collection page. 
- Added a publisher filter. 
- You can now use selfhosted deployments with the companion app. 
### Removed

- Removed unused book groups API routes. 
### Fixed

- Fixed a bug which caused the book detail sidenav to not overlay correctly. 
- Fixed a bug which caused the book information to grow bigger then it should. 
- Fixed an inconsistency in the reset password form. 
- Fixed mail logging. 
- Fixed performance issues when filtering by publisher. 
- Fixed various issues relating to JWT verification. 
### Documentation

- Documented the usage of the e-mail templates. 


## v1.2.2  - 13.3.2024

### Added

- Added a licenses page to the frontend. 
- Added the option to monitor the backend via Sentry. 
- The API URL can now be set via a config file. 
- The frontend container can now be configured via environment variables. 
### Fixed

- Actually use the mail.from setting as from in outgoing mail. 
- Fixed a bug which caused errors if no publisher for a book was found. 
- Fixed a bug which caused the EMail to not be displayed on the signup-success page. 
- Fixed an error which ocurred if none of the saved books where missing a cover. 
### Documentation

- Added a documentation page at docs.booklify.me 
- Added example docker-compose file. 


## v1.2.1  - 12.2.2024

### Changed

- The Book Group Icon of favourites has been changed to a heart. 
### Fixed

- Fixed a frontend bug which caused the favorite toggle to show up for user that are not logged in. 


## v1.2.0  - 11.2.2024

### Added

- Added Amazon referral link button to book details. 
- Added a button to the book interaction menu which copies the link to the books' page. 
- Added a feature which allows users to favorite books. 
- Added a standalone page for viewing book details. 
- Reduce backend load by allowing the usage of a CDN for media delivery. 
### Changed

- Updated the browser icons to match the companion app. 
### Fixed

- Fixed a duplicated log entry. 
- Fixed a few typos. 
- Limit the length of book titles shown in the book cards. 


## v1.1.1  - 13.1.2024

### Fixed

- Fixed a bug which caused scrollbars to always be shown in sidenav. 
- Fixed a bug which sometimes caused the book groups to be shown with incorrect titles. 


## v1.1.0  - 12.1.2024

### Added

- Add-An-Hide has been added to the Companion App 
- Added a 'Add And Hide' button to the add book dialog. 
- Added a new interaction menu for the book cards. 
- Added an author filter to the collection pages.  
- Added the ability to exclude books from the auto grouping algorithms. (Usefull for excluding false-positives) 
- Added the ability to hide books from the public account page. 
### Changed

- Greatly improved frontend performance for collections with many books. 
- Refined the automatic book grouping. 
### Removed

- Collections with only one book are no longer collapsed by default. 
### Fixed

- Fixed a bug which prevented signup if recaptcha was disabled. 
- Fixed a bug, which caused inactive users to be logged out. 
- Fixed a bug, which caused the backend to indicate a system error if a book could not be found.  
- Fixed a bug, which caused the sidenav info about a book to not update correctly. 
- If no books match the given filter an appropriate message will be displayed. 


## v1.0.3  - 31.12.2023

### Added

- Added a loading indicator for the collection page. 
### Changed

- Fonts are now served by Booklify instead of Google. 
- Icons are now served by Booklify instead of Google. 
- Improved search times by an average of 40% when getting a book for the first time. 
- Improved the error feedback if a book was not found. 
- Updated the app icon. (Credits to [Lonaasan](https://shadowlona.dev)) 
### Fixed

- Added a fallback when visiting an url which does not exist. 
- Fixed a bug which caused the frontend to send mallformated ISBNs to the backend. 
- Fixed a race condition, which sometimes logged out users with valid sessions. 
- Fixed some typos. 
- Fixed the scheduling of invalidation outdated sessions. 
- Fixed webmanifest for frontend. 


## v1.0.2  - 31.12.2023

### Fixed

- Fixed a rare error while grouping books, that sometimes occurred when a book had no number in its title.  
- Fixed an issue which prevented a book to be found if OpenLibrary returned malformed data. 


## v1.0.1  - 30.12.2023

> Fixing a few day one issues.

### Added

- Improved the UI Feedback when adding a book to the collection. 
### Changed

- Books now only get sorted into their series if at least one other book of this series is present in the collection. 
### Fixed

- Fixed a bug which caused the book groups to jitter in older browsers. 
- Fixed a bug which sometimes did not let users add books if they have to few in their collection. 
- Fixed the book series detection in certain cases where the title was weirdly formated by the publisher. 
- Fixed the name of the Android App 


## v1.0.0  - 29.12.2023

> The first release of Booklify

No Changes 

