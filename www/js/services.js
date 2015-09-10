angular.module('notivent.services', [])

	.service('OAuth', ['WebSQL',
		function (WebSQL) {
			var accessToken;
			var refreshToken;

			this.setAccessToken = function (accessToken) {
				if(accessToken){
					this.accessToken = accessToken;
					WebSQL.store('accessToken', accessToken);
				}
			};
			this.getAccessToken = function () {
				WebSQL.retrieve('accessToken').then(function(result){
					this.accessToken = result;
				}, function(error){
					console.warn(error);
				});
				return this.accessToken;
			};

			this.setRefreshToken = function (refreshToken) {
				if(refreshToken){
					this.refreshToken = refreshToken;
					WebSQL.store('refreshToken', refreshToken);
				}
			};
			this.getRefreshToken = function () {
				WebSQL.retrieve('refreshToken').then(function(result){
					this.refreshToken = result;
				}, function(error){
					console.warn(error);
				});
				return this.refreshToken;
			}
	}])

	.service('WebSQL', ['$q',
		function ($q) {

			var hmac = forge.hmac.create();
			hmac.algorithm = 'sha256';
			var username = "notivent";
			var storageKey = "18a8047c4425d92cfe0e53fc3a2ed6d50c6b0df5b1a0fcdd65f00cd1f9bc8072";
			var iv = "@½m|Ê`.Çïí¶iÇãëãvsBhï/q¼E÷!z¯X³2­z´'½.U÷.~QÀºMÜöÑvÃV&fi*a0lÕX`4· Âuê±bù°Ë°Rù)ö¿êmöIÀËKÆ­|Ã>ðèHø";
			var salt = hmacDigest(hmac, username + storageKey, iv);

			function hmacDigest(hmac,message,iv){
				hmac.start(hmac.algorithm, iv);
				hmac.update(message);
				return hmac.digest().toHex();
			}

			this.database = null;
			var that = this;

			console.log("Database manager service");
			document.addEventListener("deviceready", onDeviceReady, false);

			function onDeviceReady() {

				that.database = window.openDatabase("storage.db", '1', 'storage', 1024 * 1024 * 10);

				that.database.transaction(function(tx) {
					tx.executeSql('CREATE TABLE IF NOT EXISTS store (id text primary key, data text, unsecure boolean)');
					tx.executeSql('CREATE TABLE IF NOT EXISTS cals (id text primary key, syncToken text)');
				});

			}

			var encryptData = function (data) {
				var key = forge.pkcs5.pbkdf2(storageKey, salt, 100, 16);
				var cipher = forge.cipher.createCipher('AES-CBC', key);
				cipher.start({iv: iv});
				var input = forge.util.createBuffer(JSON.stringify(data), "utf8");
				cipher.update(input);
				cipher.finish();
				return cipher.output.toHex();
			};

			var decryptData = function (res, id) {
				salt = hmacDigest(hmac, id, iv);
				var key = forge.pkcs5.pbkdf2(storageKey, salt, 100, 16);
				var decipher = forge.cipher.createDecipher('AES-CBC', key);
				var encrypted = forge.util.createBuffer();
				encrypted.putBytes(forge.util.hexToBytes(res.rows.item(0).data));
				decipher.start({iv: iv});
				decipher.update(encrypted);
				decipher.finish();
				return JSON.parse(decipher.output);
			};

			function store(id, data, unsecure){

				unsecure = Boolean(unsecure) === true ? 1 : 0;

				if(!unsecure){
					if(!id){
						alert('Cannot set store info for ' + id + '. One of the necessary components is missing.');
						return;
					}

					salt = hmacDigest(hmac, id, iv);

					try{
						var dataToStore = encryptData(data);
					} catch(err) {
						console.warn('setDBStore of ' + id + ' failed to encrypt: ' + err);
					}
				} else {
					var dataToStore = data;
				}

				var deferred = $q.defer();

				that.database.transaction(function(tx) {
					tx.executeSql("INSERT OR REPLACE INTO store (id, data, unsecure) VALUES (?, ?, ?);",
						[id, dataToStore, unsecure],
						function(tx, res) {
							console.log('setDBStore of ' + id + ' succeeded');
							deferred.resolve(res.rowsAffected);
						}, function(e) {
							console.warn('setDBStore of ' + id + ' failed: ' + e);
							deferred.reject(e);
						});
				});

				return deferred.promise;
			}

			function retrieveLike(id){
				return retrieve(id, true);
			}

			function retrieve(id, like){

				var deferred = $q.defer();

				that.database.transaction(function(tx) {
					tx.executeSql("select * from store where id " + (like?'like':'=') + " ?;", [id], function(tx, res) {
						if(res.rows.length === 0){
							console.log("getDBStore of " + id + " is empty. Returning");
							return deferred.resolve(null);
						} else if (res.rows.item(0).id === null){
							// This will occur when the CursorWindow runs out of memory trying to pull data from the database into memory.
							// This was solved initially by stripping down data being loaded in EvvPatient.
							// Refer to branch EVV-183061031
							Notify.alert('An error occurred retrieving data from the database.', null, 'Message', 'close');
							console.log("getDBStore of " + id + " is empty. Returning");
							return deferred.resolve(null);
						}

						if(!res.rows.item(0).unsecure){
							try{
								var data = decryptData(res, id);
							} catch(err){
								console.warn('getDBStore of ' + id + ' failed to decrypt. Returning empty. :' + err);
							}
						} else {
							if(like){
								var data = [];
								for (var i = 0; i < res.rows.length; i++) {
									var item = {};
									item.id = res.rows.item(i).id;
									item.data = res.rows.item(i).data;
									data.push(item);
								}
							} else {
								var data = [];
								for (var i = 0; i < res.rows.length; i++) {
									data.push(res.rows.item(0).data);
								}
							}
						}
						console.log('getDBStore of ' + id + ' succeeded');
						deferred.resolve(data);
					}, function(e) {
						console.warn('getDBStore of ' + id + ' failed: ' + e);
						deferred.reject(e);
					});
				});

				return deferred.promise;
			}

			function storeCal(id, syncToken){

				var deferred = $q.defer();

				syncToken = syncToken ? syncToken : null;

				that.database.transaction(function(tx) {
					tx.executeSql("INSERT OR REPLACE INTO cals (id, syncToken) VALUES (?, ?);",
						[id, syncToken],
						function(tx, res) {
							console.log('storeCal of ' + id + ' succeeded');
							deferred.resolve(res.rowsAffected);
						}, function(e) {
							console.warn('storeCal of ' + id + ' failed: ' + e);
							deferred.reject(e);
						});
				});

				return deferred.promise;
			}

			function retrieveCals(){

				var deferred = $q.defer();

				that.database.transaction(function(tx) {
					tx.executeSql("select * from cals;", [], function(tx, res) {
						if(res.rows.length === 0){
							console.log("retrieveCals is empty. Returning");
							return deferred.resolve(null);
						} else if (res.rows.item(0).id === null){
							Notify.alert('An error occurred retrieving data from the database. Data is too large.', null, 'Message', 'close');
							console.log("retrieveCals of is empty. Returning");
							return deferred.resolve(null);
						}

						var data = [];
						for (var i = 0; i < res.rows.length; i++) {
							data.push(res.rows.item(i));
						}
						console.log('retrieveCals succeeded');
						deferred.resolve(data);
					}, function(e) {
						console.warn('retrieveCals failed: ' + e);
						deferred.reject(e);
					});
				});

				return deferred.promise;
			}

			function deleteByKey(id){

				var deferred = $q.defer();

				that.database.transaction(function(tx) {
					tx.executeSql("DELETE FROM store where id = ?", [id],
						function(tx, res) {
							console.log('deleteByKey succeeded');
							deferred.resolve(res.rowsAffected);
						}, function(e) {
							console.warn('deleteByKey failed: ' + e);
							deferred.reject(null);
						});
				});

				return deferred.promise;
			}

			return {
				store: store,
				storeCal: storeCal,
				retrieve: retrieve,
				retrieveLike: retrieveLike,
				retrieveCals: retrieveCals,
				deleteByKey: deleteByKey
			};
	}]);