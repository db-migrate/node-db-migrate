test:
	@node node_modules/lab/bin/lab -I Builder,dryRun,log
	@node node_modules/jscs/bin/jscs index.js lib/*
test-cov:
	@node node_modules/lab/bin/lab -t 89 -I Builder,dryRun,log
	@node node_modules/jscs/bin/jscs index.js lib/*
test-cov-html:
	@node node_modules/lab/bin/lab -r html -o coverage.html -I Builder,dryRun,log

.PHONY: test test-cov test-cov-html
