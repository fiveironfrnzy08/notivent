angular.element(document).ready(function() {
	document.addEventListener('deviceready', function () {
		var body = $(document).find('body');
		angular.bootstrap(body, ['notivent']);
	}, false);
});

angular.module('notivent', [
	'ionic',
	'ionic.service.core',
	'ionic.service.push',
	'ngCordova',
	'notivent.services',
	'notivent.directives',
	'notivent.controllers'
])

	.config(function ($stateProvider, $urlRouterProvider) {

		$stateProvider

			.state('tab', {
				url: '/tab',
				abstract: true,
				templateUrl: 'templates/tabs.html'
			})

			.state('tab.feed', {
				url: '/feed',
				views: {
					'feed-tab': {
						templateUrl: 'templates/feed.html',
						controller: 'FeedController'
					}
				}
			})

			.state('tab.settings', {
				url: '/settings',
				views: {
					'feed-tab': {
						templateUrl: 'templates/settings.html',
						controller: 'SettingsController'
					}
				}
			});

		$urlRouterProvider.otherwise('/tab/feed');

	})
	.run(function() {
		window.spinner = plugins.spinnerDialog;
	});