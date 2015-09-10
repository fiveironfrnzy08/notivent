angular.module('notivent.controllers', [])

	.controller('FeedController', ['$rootScope', '$scope', 'OAuth', '$ionicPlatform', 'WebSQL', '$q', '$timeout',
		function ($rootScope, $scope, OAuth, $ionicPlatform, WebSQL, $q, $timeout) {

			spinner.show(null, "Loading calendar", true);

			$scope.cals = {};
			var refreshToken;
			var accessToken;
			var promises = [];

			promises.push(
				WebSQL.retrieve('refreshToken').then(function(result) {
					if(result && result[0]){
						refreshToken = result[0];
					}
				}, function(error){
					console.warn(error);
					$scope.error = error;
				})
			);
			promises.push(
				WebSQL.retrieve('accessToken').then(function(result) {
					if(result && result[0]){
						accessToken = result[0];
					}
				}, function(error){
					console.warn(error);
					$scope.error = error;
				})
			);
			$q.all(promises).then(function(){
				if(refreshToken && accessToken){
					console.log('refresh');
					$scope.authType = 'refresh';
					$.oauth2({
						auth_url: 'https://accounts.google.com/o/oauth2/auth',
						token_url: 'https://accounts.google.com/o/oauth2/token',
						response_type: 'code',
						client_id: '843842939683-eg5k2v48mhdgbd0m3knhbcck9463q3l7.apps.googleusercontent.com',
						grant_type: 'refresh_token',
						client_secret: 't6vtYOdccrfWyZ6_FVIf9zAP',
						refresh_token: refreshToken,
						access_token: accessToken,
						redirect_uri: 'http://localhost:8100/callback',
						other_params: {scope: 'https://www.googleapis.com/auth/calendar'}
					}, function (token, response) {
						console.log('refresh: ' + token);
						console.log(response);
						$scope.handleAuth(token, response);
					}, function (error, response) {
						console.warn(error);
						console.warn(response);
						$scope.error = error;
						spinner.hide();
					});
				} else {
					console.log('initial');
					$scope.authType = 'initial';
					$.oauth2({
						auth_url: 'https://accounts.google.com/o/oauth2/auth',
						response_type: 'code',
						client_secret: 't6vtYOdccrfWyZ6_FVIf9zAP',
						token_url: 'https://accounts.google.com/o/oauth2/token',
						client_id: '843842939683-eg5k2v48mhdgbd0m3knhbcck9463q3l7.apps.googleusercontent.com',
						redirect_uri: 'http://localhost:8100/callback',
						other_params: {scope: 'https://www.googleapis.com/auth/calendar', access_type: 'offline'}
					}, function (token, response) {
						console.log('initial: ' + token);
						console.log(response);
						$scope.handleAuth(token, response);
					}, function (error, response) {
						console.warn(error);
						console.warn(response);
						$scope.error = error;
						spinner.hide();
					});
				}
			});

			var requestList = function (index) {

				var params = {
					'calendarId': $scope.cals[index].id,
					'pageToken': $scope.cals[index].nextPageToken
				};
				if($scope.cals[index].syncToken){
					params.syncToken = $scope.cals[index].syncToken;
				}

				var request = gapi.client.calendar.events.list(params);

				try {
					request.execute(function (response) {

						$scope.cals[index].nextPageToken = response.nextPageToken;

						$scope.cals[index].syncToken = response.nextSyncToken;
						if($scope.cals[index].syncToken){
							WebSQL.storeCal($scope.cals[index].id, $scope.cals[index].syncToken);
						}

						if(response.items){
							if($scope.cals[index].items){
								$.merge($scope.cals[index].items, response.items);
							} else {
								$scope.cals[index].items = response.items;
							}
						}

						if($scope.cals[index].nextPageToken){
							requestList(index);
						} else {
							nextRequest(index);
						}

						$timeout(function () {
							$scope.$apply();
						});

					}, function (error) {
						nextRequest(index);
						$scope.error = error;
						spinner.hide();
					});
				} catch (e) {
					nextRequest(index);
					spinner.hide();
					throw e;
				}
			};

			function nextRequest(index){
				if($scope.cals[index+1]){
					requestList(index+1);
				} else {
					spinner.hide();
				}
			}

			$scope.handleAuth = function(token, response){

				var allCals = ['fiveironfrnzy08@gmail.com','isd282.org_q0ssoj8f02md7u5jd843amter0@group.calendar.google.com','apol5ib4uajkjs73m8fjtqq7cg@group.calendar.google.com'];
				WebSQL.retrieveCals().then(function(cals){
					var ids = [];
					for (var i = 0; i < cals.length; i++) {
					    ids.push(cals[i].id);
					}
					for (var i = 0; i < allCals.length; i++) {
					    if($.inArray(allCals[i], ids) === -1){
							WebSQL.storeCal(allCals[i]);
						}
					}
				});

				OAuth.setAccessToken(token);
				OAuth.setRefreshToken(response.refresh_token);

				gapi.client.setApiKey('AIzaSyAvO51RiSchOOpoYFBDhl6ITvUQpcM3Kd4');
				gapi.client.load('calendar', 'v3', function(){

					WebSQL.retrieveCals().then(function(cals){
						$scope.cals = cals;
						requestList(0);
					});

				}, function(error) {
					$scope.error = error;
					spinner.hide();
				});
			};

			$scope.isFeedShown = function(id){
				return $scope.shownFeed === id
			}

			$scope.toggleFeed = function (id) {
				if ($scope.isFeedShown(id)) {
					$scope.shownFeed = null;
				} else {
					$scope.shownFeed = id;
				}
			};

		}])
	.controller('SettingsController', ['$scope', 'WebSQL',
		function ($scope, WebSQL) {

			$scope.deleteSyncToken = function(){
				WebSQL.deleteByKey('nextSyncToken').then(function(){
					console.log('Deleted nextSyncToken')
				});
			}

		}]);