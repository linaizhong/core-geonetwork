(function() {
  goog.provide('gn_usergroup_controller');

  var module = angular.module('gn_usergroup_controller',
      []);


  /**
   * UserGroupController provides all necessary operations
   * to manage users and groups.
   */
  module.controller('GnUserGroupController', [
    '$scope', '$routeParams', '$http', '$rootScope', '$translate', '$compile',
    function($scope, $routeParams, $http, $rootScope, $translate, $compile) {


      var templateFolder = '../../catalog/templates/admin/usergroup/';
      var availableTemplates = [
        'users', 'groups'
      ];

      // By default display groups tab
      $scope.defaultUserGroupTab = 'groups';

      $scope.getTemplate = function() {
        $scope.type = $scope.defaultUserGroupTab;
        if (availableTemplates.indexOf($routeParams.userGroupTab) > -1) {
          $scope.type = $routeParams.userGroupTab;
        }
        return templateFolder + $scope.type + '.html';
      };


      // TODO : should provide paging
      $scope.maxHitsForPreview = 50;


      // Scope for group
      // List of catalog groups
      $scope.groups = null;
      $scope.groupSelected = {id: $routeParams.groupId};
      // List of metadata records attached to the selected group
      $scope.groupRecords = null;
      // On going changes group ...
      $scope.groupUpdated = false;
      $scope.groupSearch = {};


      // Scope for user
      // List of catalog users
      $scope.users = null;
      $scope.userSelected = {};
      // List of group for selected user
      $scope.userGroups = {};
      // Indicate if an update is going on
      $scope.userOperation = 'editinfo';
      $scope.userIsAdmin = false;
      // On going changes for user ...
      $scope.userUpdated = false;


      function loadGroups() {
        $http.get($scope.url + 'admin.group.list@json').success(function(data) {
          $scope.groups = data;
        }).error(function(data) {
          // TODO
        });
      }
      function loadUsers() {
        $http.get($scope.url + 'admin.user.list@json').success(function(data) {
          $scope.users = data;
        }).error(function(data) {
          // TODO
        });
      }



      /**
       * Add an new user based on the default
       * user config.
       */
      $scope.addUser = function() {
        $scope.unselectUser();
        $scope.userOperation = 'newuser';
        $scope.userSelected = {
          id: '',
          username: '',
          password: '',
          name: '',
          surname: '',
          profile: 'RegisteredUser',
          address: '',
          city: '',
          state: '',
          zip: '',
          country: '',
          email: '',
          organisation: ''
        };
      };

      /**
       * Remove current user from selection and
       * clear user groups and records.
       */
      $scope.unselectUser = function() {
        $scope.userSelected = null;
        $scope.userGroups = null;
        $scope.userUpdated = false;
        $scope.userRecords = null;
        $scope.userOperation = 'editinfo';
      };

      /**
       * Select a user and retrieve its groups and
       * metadata records.
       */
      $scope.selectUser = function(u) {
        // Load user group and then select user
        $http.get($scope.url + 'admin.usergroups.list@json?id=' + u.id)
                .success(function(data) {
              $scope.userGroups = data;
              $scope.userSelected = u;
              $scope.userIsAdmin = u.profile === 'Administrator';
            }).error(function(data) {
              // TODO
            });
        // Retrieve records in that group
        $http.get($scope.url + 'q@json?fast=index&template=y or n&_owner=' +
                u.id + '&sortBy=title&from=1&to=' + $scope.maxHitsForPreview)
                .success(function(data) {
              $scope.userRecords = data.metadata;
            }).error(function(data) {
              // TODO
            });
        $scope.userUpdated = false;
      };


      /**
       * Check if the groupId is in the user groups
       * list with that profile.
       *
       * Note: A user can have more than one profile
       * for a group.
       */
      $scope.isUserGroup = function(groupId, profile) {
        for (var i = 0; i < $scope.userGroups.length; i++) {
          if ($scope.userGroups[i].id == groupId &&
              $scope.userGroups[i].profile == profile) {
            return true;
          }
        }
        return false;
      };

      /**
       * Compute user profile based on group/profile select
       * list. This is closely related to the template manipulating
       * element ids.
       *
       * Searching through the list, compute the highest profile
       * for the user and set it.
       * When a user is a reviewer of a group, the corresponding
       * group is also selected in the editor profile list.
       */
      $scope.setUserProfile = function(isAdmin) {
        $scope.userUpdated = true;
        if (isAdmin) {
          // Unselect all groups option
          for (var i = 0; i < $scope.profiles.length; i++) {
            if ($scope.profiles[i] !== 'Administrator') {
              $('#groups_' + $scope.profiles[i])[0].selectedIndex = -1;
            }
          }
          $scope.userSelected.profile =
              $scope.userIsAdmin ? 'Administrator' : $scope.profiles[0];
        } else {
          // Define the highest profile for user
          var newprofile = 'RegisteredUser';
          for (var i = 0; i < $scope.profiles.length; i++) {
            if ($scope.profiles[i] !== 'Administrator') {
              var groups = $('#groups_' + $scope.profiles[i])[0];
              // If one of the group is selected, main user profile is updated
              if (groups.selectedIndex > -1 &&
                  groups.options[groups.selectedIndex].value != '') {
                newprofile = $scope.profiles[i];
              }
            }
          }
          $scope.userSelected.profile = newprofile;

          // If user is reviewer in one group, he is also editor for that group
          var editorGroups = $('#groups_Editor')[0];
          var reviewerGroups = $('#groups_Reviewer')[0];
          if (reviewerGroups.selectedIndex > -1) {
            for (var j = 0; j < reviewerGroups.options.length; j++) {
              if (reviewerGroups.options[j].selected) {
                editorGroups.options[j].selected = true;
              }
            }
          }
        }
      };


      $scope.updatingUser = function() {
        $scope.userUpdated = true;
      };


      /**
       * Save a user.
       */
      $scope.saveUser = function(formId) {
        $http.get($scope.url + 'admin.user.update?' + $(formId).serialize())
        .success(function(data) {
              $scope.unselectUser();
              loadUsers();
              $rootScope.$broadcast('StatusUpdated', {
                msg: $translate('userUpdated'),
                timeout: 2,
                type: 'success'});
            })
        .error(function(data) {
              $rootScope.$broadcast('StatusUpdated', {
                title: $translate('userUpdateError'),
                error: data,
                timeout: 0,
                type: 'danger'});
            });
      };

      /**
       * Delete a user.
       */
      $scope.deleteUser = function(formId) {
        $http.get($scope.url + 'admin.user.remove?id=' +
                $scope.userSelected.id)
        .success(function(data) {
              $scope.unselectUser();
              loadUsers();
            })
        .error(function(data) {
              $rootScope.$broadcast('StatusUpdated', {
                title: $translate('userDeleteError'),
                error: data,
                timeout: 0,
                type: 'danger'});
            });
      };








      $scope.addGroup = function() {
        $scope.unselectGroup();
        $scope.groupSelected = {
          id: '',
          name: '',
          description: '',
          email: ''
        };
      };

      $scope.saveGroup = function(formId) {
        $http.get($scope.url + 'admin.group.update?' + $(formId).serialize())
        .success(function(data) {
              $scope.unselectGroup();
              loadGroups();
              $rootScope.$broadcast('StatusUpdated', {
                msg: $translate('groupUpdated'),
                timeout: 2,
                type: 'success'});
            })
        .error(function(data) {
              $rootScope.$broadcast('StatusUpdated', {
                title: $translate('groupUpdateError'),
                error: data,
                timeout: 0,
                type: 'danger'});
            });
      };

      $scope.deleteGroup = function(formId) {
        $http.get($scope.url + 'admin.group.remove?id=' +
                $scope.groupSelected.id)
        .success(function(data) {
              $scope.unselectGroup();
              loadGroups();
            })
        .error(function(data) {
              $rootScope.$broadcast('StatusUpdated', {
                title: $translate('groupDeleteError'),
                error: data,
                timeout: 0,
                type: 'danger'});
            });
      };

      /**
       * Save a translation
       */
      $scope.saveTranslation = function(e) {
        // TODO: No need to save if translation not updated

        // Save value in translation
        // TODO : could we use Angular compile here ?
        var xml = "<request><group id='{{id}}'>" +
            '<label>' +
            '<{{key}}>{{value}}</{{key}}>' +
                        '</label>' +
            '</group></request>';
        xml = xml.replace('{{id}}', $scope.groupSelected.id)
                    .replace(/{{key}}/g, e.key)
                    .replace('{{value}}', e.value);
        $http.post($scope.url + 'admin.group.update.labels', xml, {
          headers: {'Content-type': 'application/xml'}
        }).success(function(data) {
        }).error(function(data) {
          $rootScope.$broadcast('StatusUpdated', {
            title: $translate('groupTranslationUpdateError'),
            error: data,
            timeout: 0,
            type: 'danger'});
        });
      };
      /**
       * Return true if selected group has metadata record.
       * This information could be useful to disable a delete button
       * for example.
       */
      $scope.groupHasRecords = function() {
        return $scope.groupRecords && $scope.groupRecords.length > 0;
      };

      $scope.unselectGroup = function() {
        $scope.groupSelected = null;
        $scope.groupUpdated = false;
        $scope.groupRecords = null;
      };

      $scope.selectGroup = function(g) {
        $scope.groupSelected = g;
        // Retrieve records in that group
        $http.get($scope.url + 'q@json?fast=index&template=y or n&group=' +
                g.id + '&sortBy=title&from=1&to=' + $scope.maxHitsForPreview)
                .success(function(data) {
              $scope.groupRecords = data.metadata;
            }).error(function(data) {
              // TODO
            });
        $scope.groupUpdated = false;
      };

      $scope.updatingGroup = function() {
        $scope.groupUpdated = true;
      };

      loadGroups();
      loadUsers();
    }]);

})();