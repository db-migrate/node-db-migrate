Without pull requests from generous people like you, this project
wouldn't be what it is today. You are planning to contribute aren't you?
If so, here's a quick guide to creating a great pull request for
this project:

1. Fork the repo.

2. Copy the test/db.config.example.json to test/db.config.json

3. Run the tests. Pull requests without tests are much less likely to be
merged, and it's great to know you're starting with a clean slate: `npm test`.
Be sure to check the README for setting up your test databases first.

4. Add a test for your change. Refactoring and documentation changes
require no new tests. If you are adding functionality or fixing a bug,
please include a test.

5. Make the test pass.

6. Push to your fork and submit a pull request.

At this point you're waiting on me. In a perfect world I'd commit to
responding to your request in some short period of time. Unfortunately,
I'm not able to do that. You'll most likely see me work off several pull
requests in batches. I may suggest some changes or improvements or alternatives
at that time. Please don't consider the feedback as a lack of
appreciation for your time and effort. It most certainly is not.

Some things that will increase the chance that your pull request is accepted,
are:

* Include good tests
* Keep the changeset small
* Stick to existing code conventions
* Update the documentation, examples elsewhere, guides,
  whatever is affected by your contribution

See my [pull request etiquette](http://kunkle.org/blog/2013/07/10/pull-request-etiquette/)
post for more contribution tips.
