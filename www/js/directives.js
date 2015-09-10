angular.module('notivent.directives', [])

	.directive('feed', [
		function () {

            var link = function ($scope, $elem, $attr) {
                //$elem = $rootScope.toString();
                //$($elem).rssfeed('http://www.zippsliquors.com/feed/atom/', {
                //    limit: 5
                //});
            };

            return {
                restrict: "E",
                scope: {
                    documentTemplate: '='
                },
                link: link,
                template: "<div></div>"
            }
        }
    ]);