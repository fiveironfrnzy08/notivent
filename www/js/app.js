var ngDocument = angular.element(document);

angular.element(ngDocument).ready(function() {
	ngDocument.on('deviceready', function() {
		var body = ngDocument.find('body');
		angular.bootstrap(body, ['notivent']);
	});
});

angular.module('notivent', [
	'ionic',
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
	.run(function($ionicPlatform) {
		//$ionicPlatform.ready(function() {
			window.spinner = plugins.spinnerDialog;
		//}, false);
	});