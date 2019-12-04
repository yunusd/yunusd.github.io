var apiUrl = (url = "") => url == 'token' ? `https://inoteapi.kod.fun/${url}` : `https://inoteapi.kod.fun/api/${url}`;

var app = angular.module('myApp', ['ngRoute']);

app.config(function ($routeProvider) {
    $routeProvider
        .when("/", {
            templateUrl: "pages/main.html",
            controller: "mainCtrl"
        })
        .when("/register", {
            templateUrl: "pages/register.html",
            controller: "registerCtrl"
        })
        .when("/login", {
            templateUrl: "pages/login.html",
            controller: "loginCtrl"
        })
        .when("/logout", {
            templateUrl: "pages/main.html",
            controller: "logoutCtrl"
        });
});

app.controller("myController", function ($http, $window, $scope, $location) {
    $scope.setLoggedInUser = function (email) {
        if (email) {
            $scope.isAuthenticated = true;
            $scope.loggedInUserEmail = email;
        } else {
            $scope.isAuthenticated = false;
            $scope.loggedInUserEmail = null;
        }
    };

    $scope.logout = function () {
        $http.post(apiUrl("account/logout"), null, $scope.requestConfig());

        $window.localStorage.clear();
        $window.sessionStorage.clear();
        $scope.setLoggedInUser();
        $location.path("login");
    }

    $scope.requestConfig = function () {
        return {
            headers: {
                Authorization: "Bearer " + $scope.auth()
            }
        }
    }
    $scope.checkAuthentication = function () {
        $scope.isAuthenticated = false;
        $scope.auth = function () {
            var local = $window.localStorage.getItem('access_token');
            var session = $window.sessionStorage.getItem('access_token')

            if (local != null) return local;
            if (session != null) return session;

            return false;
        }

        if (!$scope.auth()) {
            $scope.isAuthenticated = false;
            $scope.loggedInUserEmail = null;
            return false;
        }

        $http.get(apiUrl("account/userinfo"), $scope.requestConfig()).then(function (res) {
            $scope.loggedInUserEmail = res.data.Email;
            $scope.isAuthenticated = true;
        }, function (res) {
            $scope.isAuthenticated = false;
            $scope.loggedInUserEmail = null;
        })
    }
    $scope.checkAuthentication();
});

app.controller("mainCtrl", function ($scope, $http, $location, $window) {

    if (!$scope.auth()) return $location.path("/login");

    $scope.selectedNote = null;
    $scope.note = {
        Id: 0,
        Title: "",
        Content: "",
    }


    $scope.isLoading = true;
    $scope.notes = [];

    $scope.loadNotes = function () {
        $http.get(apiUrl("notes/getnotes"), $scope.requestConfig()).then(
            function (res) {
                $scope.notes = res.data;
                $scope.isLoading = false;
            },
            function (err) {
                if (err.status == 401) $location.path("/login")
            }
        );
    }

    $scope.newNote = function (e) {
        if(e) e.preventDefault();

        $scope.note = null;

        $scope.note = {
            Id: 0,
            Title: "",
            Content: "",
        }
    }

    $scope.showNote = function (e, note) {
        if(e) e.preventDefault();
        $scope.note = angular.copy(note);
        $scope.selectedNote = note;
    }

    $scope.saveNote = function (e) {
        e.preventDefault();
        if ($scope.note.Id !== 0) {
            $http.put(apiUrl("notes/putnote/" + $scope.note.Id), $scope.note, $scope.requestConfig()).then(
                function (res) {
                    $scope.selectedNote.Title = res.data.Title;
                    $scope.selectedNote.Content = res.data.Content;
                    $scope.selectedNote.ModifiedTime = res.data.ModifiedTime;
                },
                function (err) {

                }
            );
        } else {
            $http.post(apiUrl("notes/postnote"), $scope.note, $scope.requestConfig()).then(
                function (res) {
                    $scope.notes.push(res.data);
                    $scope.showNote(null, res.data)
                },
                function (err) {

                }
            );
        }
    }

    $scope.deleteNote = function (e) {
        e.preventDefault();
        $http.delete(apiUrl("notes/deletenote/" + $scope.note.Id), $scope.requestConfig()).then(
            function (res) {
                let i = $scope.notes.indexOf($scope.selectedNote);
                $scope.notes.splice(i, 1);
                $scope.newNote()
            },
            function (err) {

            }
        );
    }

    $scope.noteActiveClass = function (id) {
        if ($scope.note == null) return "";

        return $scope.note.Id == id ? "active" : "";
    }

    $scope.loadNotes();
});

app.controller("loginCtrl", function ($scope, $http, $location, $timeout, $window) {
    $scope.error = "";

    $scope.isRememberMe = false;

    $scope.user = {
        grant_type: "password",
        username: "",
        password: "",
    }

    $scope.login = function (e) {
        e.preventDefault();
        $scope.error = "";
        $scope.successMessage = "";
        $http({
            url: apiUrl('token'),
            method: 'POST',
            data: "username=" + $scope.user.username + "&password=" + $scope.user.password +
                "&grant_type=password"
        }).then(function (res) {
            $scope.error = "";
            $scope.successMessage = "Başarılı bir şekilde giriş yaptınız";

            if ($scope.isRememberMe)
                $window.localStorage.setItem('access_token', res.data.access_token)
            else
                $window.sessionStorage.setItem('access_token', res.data.access_token)

            $scope.setLoggedInUser($scope.user.username)

            $scope.user = {
                email: "",
                password: "",
            };

            $timeout(() => $location.path("/"), 1000);
        }, function (res) {
            $scope.error = res.data.error_description;
        });
    }
    $scope.hasErrors = function () {
        return $scope.error !== "";
    }
});

app.controller("registerCtrl", function ($scope, $http) {
    $scope.errors = [];
    $scope.successMessage = "";

    $scope.user = {
        Email: "",
        Password: "",
        ConfirmPassword: ""
    }

    $scope.register = function (e) {
        $scope.errors = [];
        e.preventDefault();
        $http.post(apiUrl('Account/register'), $scope.user).then(function (res) {
            $scope.successMessage = `Kayıt başarılı. Şimdi giriş yapabilirsin, ${$scope.user.Email}`;
            $scope.user = {
                Email: "",
                Password: "",
                ConfirmPassword: ""
            };
        }, function (res) {
            $scope.errors = getErrors(res.data.ModelState);
        });
    }
    $scope.hasErrors = function () {
        return $scope.errors.length > 0;
    }
});

function getErrors(modelState) {
    var errors = [];

    for (var key in modelState) {
        for (var i = 0; i < modelState[key].length; i++) {
            errors.push(modelState[key][i]);
            if (modelState[key][i].includes('zaten alınmış'))
                break;
        }
    }

    return errors;
}
