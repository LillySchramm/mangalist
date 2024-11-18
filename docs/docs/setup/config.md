---
sidebar_position: 8
description: Configuration options for the application
---

# Config

These are all the configuration options which can be set for the application.

## amazon
**Type:** `object`
### amazon.referral_tag
**Type:** `string`\
**Description:** If set, this tag will be appended to all Amazon links and a note regarding this will be added beneath the link.\
**Examples:**
- `"your-tag-20"`

## api_url
**Type:** `string`\
**Default:** `"http://localhost:3000"`\
**Description:** The URL of the API server.
## cdn_url
**Type:** `string`\
**Description:** The URL of the CDN server. If set the frontend will use this URL to load book covers instead of using the backend.\
**Examples:**
- `"https://cdn.example.com"`

## cors
**Type:** `string`\
**Default:** `"*"`\
**Description:** The CORS policy which should be used by the server.\
**Examples:**
- `"https://example.com"`
- `"*"`
- `"http://localhost:4200"`

## db
**Type:** `object`
### db.url
**Type:** `string`\
**Default:** `"postgresql://uwu:owo@localhost:5432/mangalist?schema=public"`\
**Description:** The database connection string. This is used to connect to the database. Please note that the container also needs to have the correct environment variables set to be able execute the migrations.
## debug
**Type:** `object`\
**Description:** Some settings which are only useful for debugging. These settings should not be used in production as they can leak sensitive information and/or have a negative impact on the performance.
### debug.always_regroup
**Type:** `boolean`\
**Default:** `false`\
**Description:** Always regroup the books when a request is made. This can be useful to test the regrouping logic.
### debug.show_query
**Type:** `boolean`\
**Default:** `false`\
**Description:** Log all SQL queries to the console.
## disable_registration
**Type:** `boolean`\
**Default:** `false`\
**Description:** Disable the registration of new users. This can be useful if you want to run the server in a private environment. Please note that this does not disable the registration of the first user.
## geonode
**Type:** `object`\
**Description:** [GeoNode](https://geonode.com/) is a paid service which provides services usefull for crawling. Read more about why you should use GeoNode for Booklify [here](/docs/crawlers/amazon).
### geonode.password
**Type:** `string`\
**Description:** Your GeoNode API password.\
**Examples:**
- `"00000000-0000-0000-0000-000000000000"`

### geonode.username
**Type:** `string`\
**Description:** Your GeoNode API username.\
**Examples:**
- `"geonode_xxxxxxxxxx"`

## isbndb
**Type:** `object`\
**Description:** [ISBNdb](https://isbndb.com/) is a paid service which provides an API which is usefull for getting book metadata. Read more about why you should use ISBNdb for Booklify [here](/docs/crawlers/isbndb).
### isbndb.key
**Type:** `string`\
**Description:** Your ISBNdb API key.\
**Examples:**
- `"00000000-0000-0000-0000-000000000000"`

## legal
**Type:** `object`\
**Description:** Some settings which which allow you to configure the legal documents which are shown to the users.
### legal.enabled
**Type:** `boolean`\
**Default:** `false`\
**Description:**  If set to true, the legal documents (or rather the links to them) will be shown to the users.
### legal.privacy_policy
**Type:** `string`\
**Default:** `"https://example.com/privacy"`\
**Description:** The URL to the privacy policy.
### legal.terms_of_service
**Type:** `string`\
**Default:** `"https://example.com/tos"`\
**Description:** The URL to the terms of service.
## loki
**Type:** `object`\
**Description:** [Loki](https://grafana.com/loki) is a log aggregation system.
### loki.api
**Type:** `string`\
**Description:** The URL of your Loki instance.\
**Examples:**
- `"https://loki.example.com"`

### loki.enabled
**Type:** `boolean`\
**Default:** `false`\
**Description:** Whether or not to use Loki for logging.
### loki.password
**Type:** `string`\
**Description:** This password will be used to authenticate against Loki. It will be used as the password for the basic authentication.
### loki.username
**Type:** `string`\
**Description:** This username will be used to authenticate against Loki. It will be used as the username for the basic authentication.
## mail
**Type:** `object`\
**Description:** Some settings which are used to configure the mail server. If the mail server is not configured, the server will not send any mails and features which require the mail server will be diabled or skiped.
### mail.enabled
**Type:** `boolean`\
**Default:** `false`
### mail.from
**Type:** `string`\
**Default:** `"Booklify"`\
**Description:** This string will be used as the from address for all mails which are sent by the server.
### mail.smtp
**Type:** `string`\
**Description:** The URL of the SMTP server. Uses the [nodemailer](https://nodemailer.com/smtp/) format.\
**Examples:**
- `"smtps://username:password@smtp.example.com/?pool=true"`

## openai
**Type:** `object`
### openai.key
**Type:** `string`\
**Description:** Set to enable AI grouping
## recaptcha
**Type:** `object`\
**Description:** Recaptcha is a service provided by Google which can be used to protect your server from bots. If you enable this service, the server will require the users to solve a captcha before they can register.
### recaptcha.enabled
**Type:** `boolean`\
**Default:** `false`\
**Description:** Whether or not to use Recaptcha.
### recaptcha.secret
**Type:** `string`\
**Default:** `"6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"`\
**Description:** The secret key which is used to authenticate against the Recaptcha API. Note that the default key is a test key which is [provided by Google](https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha.-what-should-i-do) and always returns a positive result.
### recaptcha.site_key
**Type:** `string`\
**Default:** `"6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"`\
**Description:** The site key which is used to authenticate against the Recaptcha API. Note that the default key is a test key which is [provided by Google](https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha.-what-should-i-do) and always returns a positive result.
## reports
**Type:** `object`
### reports.contact_email
**Type:** `string`\
**Default:** `"uwu@example.com"`\
**Description:** The email address which will be used as the contact address in the reports.
### reports.enabled
**Type:** `boolean`\
**Default:** `true`\
**Description:** If set to true, users will be able to report other users to you.
## s3
**Type:** `object`\
**Description:** Booklify uses S3 to store the book covers. If you don't have an S3 instance, you can use [MinIO](https://min.io/) to run your own S3 instance.
### s3.access_key
**Type:** `string`\
**Description:** The access key which is used to authenticate against the S3 instance.\
**Examples:**
- `"xxxxxxxxxxxxxxxxxxxx"`

### s3.bucket_name
**Type:** `string`\
**Default:** `"mangalist"`\
**Description:** The name of the bucket which is used to store the book covers.
### s3.endpoint
**Type:** `string`\
**Description:** The URL of the S3 instance.\
**Examples:**
- `"s3.example.com"`

### s3.port
**Type:** `integer`\
**Default:** `9000`\
**Description:** The port of the S3 instance.
### s3.secret_key
**Type:** `string`\
**Description:** The secret key which is used to authenticate against the S3 instance.\
**Examples:**
- `"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`

### s3.use_ssl
**Type:** `boolean`\
**Default:** `false`\
**Description:** Whether or not to use SSL to connect to the S3 instance.
## security
**Type:** `object`
### security.access_token_expiration
**Type:** `string`\
**Default:** `"1h"`\
**Description:** How long the access token is valid.
### security.key
**Type:** `string`\
**Default:** `"AVerySecurePassword"`\
**Description:** The key which is used to encrypt sertain data. This key should be kept secret. Cannot be changed after the first start. **Make sure to change this key when you deploy the server!**
### security.max_session_idle_days
**Type:** `integer`\
**Default:** `90`\
**Description:** How long a session is valid if the user is not active. After this time the user will be logged out.
### security.max_temp_session_age_days
**Type:** `integer`\
**Default:** `1`\
**Description:** How long a temporary session can be renewed. After this time the temporary session will be deleted.
## sentry
**Type:** `object`\
**Description:** [Sentry](https://sentry.io/) is a service which can be used to track errors.
### sentry.backend
**Type:** `object`
#### sentry.backend.dsn
**Type:** `string`\
**Description:** The DSN of your Sentry instance and project.\
**Examples:**
- `"https://00000000000000000000000000000000@sentry.example.com/0"`

#### sentry.backend.enabled
**Type:** `boolean`\
**Default:** `false`\
**Description:** Whether or not to use Sentry for backend errors.
### sentry.environment
**Type:** `string`\
**Description:** The environment in which the server is running. This can be used to filter the errors in Sentry.\
**Examples:**
- `"production"`
- `"staging"`
- `"development"`

## tasks
**Type:** `object`\
**Description:** Cron jobs which are used to run tasks in the background. **Make sure you know what you are doing when you change these settings, as they can have a big impact on the performance and functionality of the server.**
### tasks.deleteUnactivatedUsers
**Type:** `object`\
**Description:** Deletes all users which have not activated their account after a week.
#### tasks.deleteUnactivatedUsers.cron
**Type:** `string`\
**Default:** `"*/5 * * * * *"`
#### tasks.deleteUnactivatedUsers.enabled
**Type:** `boolean`\
**Default:** `true`
### tasks.doLongruning
**Type:** `object`\
**Description:** Processes pending crawlers which take a long time to run (e.g. Amazon).
#### tasks.doLongruning.cron
**Type:** `string`\
**Default:** `"* * * * *"`
#### tasks.doLongruning.enabled
**Type:** `boolean`\
**Default:** `true`
### tasks.flushLoki
**Type:** `object`\
**Description:** Flushes the logs to Loki.
#### tasks.flushLoki.cron
**Type:** `string`\
**Default:** `"*\\10 * * * * *"`
#### tasks.flushLoki.enabled
**Type:** `boolean`\
**Default:** `false`
### tasks.invalidateOutdatedSessions
**Type:** `object`\
**Description:** Will invalidate all sessions which are older than the configured time.
#### tasks.invalidateOutdatedSessions.cron
**Type:** `string`\
**Default:** `"0 * * * *"`
#### tasks.invalidateOutdatedSessions.enabled
**Type:** `boolean`\
**Default:** `true`
### tasks.invalidateOutdatedTempSessions
**Type:** `object`\
**Description:** Will invalidate all temporary sessions which are older than the configured time.
#### tasks.invalidateOutdatedTempSessions.cron
**Type:** `string`\
**Default:** `"* * * * *"`
#### tasks.invalidateOutdatedTempSessions.enabled
**Type:** `boolean`\
**Default:** `true`
### tasks.recrawlCover
**Type:** `object`\
**Description:** Will recrawl the cover of all books which have the respective flag set.
#### tasks.recrawlCover.cron
**Type:** `string`\
**Default:** `"* * * * *"`
#### tasks.recrawlCover.enabled
**Type:** `boolean`\
**Default:** `true`
### tasks.recrawlInfo
**Type:** `object`\
**Description:** Will recrawl the info of all books which have the respective flag set.
#### tasks.recrawlInfo.cron
**Type:** `string`\
**Default:** `"* * * * *"`
#### tasks.recrawlInfo.enabled
**Type:** `boolean`\
**Default:** `true`
### tasks.sendChangelog
**Type:** `object`\
**Description:** Will send the changelog to all users which did not receive it yet.
#### tasks.sendChangelog.cron
**Type:** `string`\
**Default:** `"*/5 * * * * *"`
#### tasks.sendChangelog.enabled
**Type:** `boolean`\
**Default:** `true`
### tasks.tryFindCover
**Type:** `object`\
**Description:** Tries to find a cover for all books which do not have a cover yet.
#### tasks.tryFindCover.cron
**Type:** `string`\
**Default:** `"*/30 * * * * *"`
#### tasks.tryFindCover.enabled
**Type:** `boolean`\
**Default:** `true`
### tasks.updateAIClassifications
**Type:** `object`
#### tasks.updateAIClassifications.cron
**Type:** `string`\
**Default:** `"*/2 * * * * *"`
#### tasks.updateAIClassifications.enabled
**Type:** `boolean`\
**Default:** `true`
### tasks.updateOutdatedGrouping
**Type:** `object`\
**Description:** Updates the grouping of all users which have had their books grouped by an outdated version of the grouping algorithm.
#### tasks.updateOutdatedGrouping.cron
**Type:** `string`\
**Default:** `"* * * * *"`
#### tasks.updateOutdatedGrouping.enabled
**Type:** `boolean`\
**Default:** `true`
## test_mode
**Type:** `boolean`\
**Default:** `false`\
**Description:** Enables the test mode. This mode is used to test the server and should not be used under any other circumstances.
## url
**Type:** `string`\
**Default:** `"http://localhost:4200"`\
**Description:** The URL of the frontend server.
## version
**Type:** `string`\
**Default:** `"v1.2.4"`\
**Description:** The version of the server, shown in the frontend.\
**Examples:**
- `"v1.0.0"`
- `"dev"`

