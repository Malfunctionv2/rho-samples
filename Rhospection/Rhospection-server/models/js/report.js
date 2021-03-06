var rc = require('rhoconnect_helpers');
var http = require('http');
var Store = rc.Store;
var Parse = require('parse').Parse;
var Common = require('../../controllers/js/common.js');

var Report = function(){

  //The login method gets called each time before the CRUD methods
  this.login = function(resp){
      username = resp.currentUser;
      password = '';
      resp.params = username;
      
      // Retrieving the password for the user that was stored in redis 
      Store.getValue(resp, function(resp){
        password = resp.result;

         Parse.initialize(Common.parse_app_id, Common.parse_key_js);
  
         Parse.User.logIn(username, password, {
           success: function(user) {
            console.log('My Backend Login: Success');
      
            resp.send(true);
           },
           error: function(user, error) {
              console.log('Error Logging In My Backend');
              new rc.LoginException(resp, error.message);
             // resp.send(false);
           }
         });
            
        
      });
    
  };

  this.query = function(resp){
    var result = {};
        
    Parse.initialize(Common.parse_app_id, Common.parse_key_js);
    //Parse.User.current should be available because we logged in in Login method
    //This is used to retrieve a list of Reports that is available to this user
    //If the ACL attribute contains the ACl that is generated for that user then
    //they would see 'private records'
    var currentUser = Parse.User.current();

    //This is the 'Report' model on Parse
    var pReport = Parse.Object.extend("Report");
    
    //Standard Parse.com JS API for query
    // Normally you will have to implement paging so that this does not return all records
    // Parse API will only return the first 1000 as default
    var query = new Parse.Query(pReport);
    query.find({
      success: function(results) {
        //Build response hash that will represent the record set
        for (var i = 0; i < results.length; i++) { 

          //This is where we map the backend data to the Rho Models
          var object = { name: results[i].get('name'), 
              pass: results[i].get('pass'),
              ispublic: results[i].get('ispublic'),
              author: results[i].get('author'),
              reportid: results[i].get('reportid')
            };

          result[results[i].id.toString()] = object
        }
        //return the result
        resp.send(result);

      },
      error: function(error) {
          new rc.Exception(resp, error.message);

      }
    });
  };

  this.create = function(resp){

    Parse.initialize(Common.parse_app_id, Common.parse_key_js);
    var currentUser = Parse.User.current();
    var PObject = Parse.Object.extend("Report");
    var pObject = new PObject();
    
    //Parse ACL = Access control list
    var postACL = new Parse.ACL(Parse.User.current());//set ACL to current user as default

    if(resp.params.create_object.ispublic == "true"){
      console.log('allowing public read only');
      postACL.setPublicReadAccess(true); //set
    }
    
    pObject.setACL(postACL); 
    //resp.params.create_object will be a JS object for the new record
    //Parse also uses a schemaless method for storing data
    //each attribute on the Rho model will be created on the backend
    //so managing fields is automatic
    pObject.save(resp.params.create_object, {
      success: function(object) {
        //We need to return the backend ID for this model
        //This will replace on the device the Model.object field
        pid=object.id;
        resp.send(pid);
        },
      error: function(error) {
        console.log('create ERROR');
        new rc.Exception(resp, error.message);

        }
      });
  };

  this.update = function(resp){
    Parse.initialize(Common.parse_app_id, Common.parse_key_js);
    var currentUser = Parse.User.current();
    var PObject = Parse.Object.extend("Report");
    
    //The 'update_object.id' field will be the backend's ID
    //because on Create we are mapping these fields
    var objId = resp.params.update_object.id;

    //Standard Parse API for updating an object
    var query = new Parse.Query(PObject);
    query.get(objId, {
      success: function(pObject) {
          //Parse ACL = Access control list
          var postACL = new Parse.ACL(Parse.User.current());//set ACL to current user as default


          if(resp.params.update_object.ispublic == "true"){
            postACL.setPublicReadAccess(true); //set public read only access
          }
          else
          {
            postACL.setPublicReadAccess(false); //set to private

          }
          pObject.setACL(postACL); 
          
        pObject.save(resp.params.update_object, {
              success: function(object) {
        
                resp.send(true);
                },
              error: function(object,error) {
                console.log('********Update ERROR'+ error.message);
                resp.exception = 'Error updating record on backend!';
                resp.send(true);
                // new rc.Exception(resp, 'Error Updating Record');

                }
              });

      },
      error: function(object, error) {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and description.
          new rc.Exception(resp, error.message);

      }
    });


    
  };

  this.del = function(resp){
    
    Parse.initialize(Common.parse_app_id, Common.parse_key_js);
    var currentUser = Parse.User.current();
    var PObject = Parse.Object.extend("Report");
    
    //The 'delete_object.id' field will be the backend's ID
    //because on Create we are mapping these fields
    var objId = resp.params.delete_object.id;
    
    var query = new Parse.Query(PObject);
    query.get(objId, {
      success: function(pObject) {
        // The object was retrieved successfully.
        // Delete the object with Parse Object.destroy method
        pObject.destroy( {
              success: function(object) {
                resp.send(true);
                },
              error: function(error) {
                new rc.Exception(resp, error.message);

                }
              });

      },
      error: function(object, error) {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and description.
        resp.send(false);
        new rc.Exception(resp, error.message);

      }
    });

    resp.send(true);
  };

  this.logoff = function(resp){
    // TODO: Logout from the data source if necessary.
    resp.send(true);
  };

  this.storeBlob = function(resp){
    // TODO: Handle post requests for blobs here.
    // Reference the blob object's path with resp.params.path.
    new rc.Exception(
      resp, "Please provide some code to handle blobs if you are using them."
    );
  };
};

module.exports = new Report();