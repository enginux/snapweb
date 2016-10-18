var _ = require('lodash');
var CONF = require('../src/js/config.js');
var Backbone = require('backbone');
var LoginModel = require('../src/js/models/simple-login.js');
var LoginView = require('../src/js/views/simple-login.js');

describe('Login', function() {

  describe('LoginModel', function() {

    beforeEach(function() {
      this.model = new LoginModel({});
      // NOTE: it seems we don't need to do jasmine.Ajax.install() anymore
      //       before installing the spies; not sure why
      spyOn(this.model, 'save').and.callThrough();
      spyOn(this.model, 'validate').and.callThrough();
    });

    afterEach(function() {
      delete this.model;
      this.model = null;
    });

    it('should be an instance of Backbone.Model', function() {
      expect(LoginModel).toBeDefined();
      expect(this.model).toEqual(jasmine.any(Backbone.Model));
    });    

    it('should block empty or invalid email', function() {
      expect(this.model.validate({})).toBeDefined();
      expect(this.model.validate({email: 'bad-email'})).toBeDefined();
    });

    it('should validate on save', function() {
      this.model.save();
      expect(this.model.validate).toHaveBeenCalled();
    });
    
  });

  describe('LoginView', function() {

    beforeEach(function() {
      this.model = new LoginModel({});
      this.view = new LoginView({
        model: this.model
      });
      this.view.render();
      
      this.emailSSO = this.view.$el.find('#emailSSO'); 
      this.password = this.view.$el.find('#password'); 
      this.btnLogin = this.view.$el.find('#btn-login');
    });
    
    afterEach(function() {
      this.view.remove();
      delete this.model;
      delete this.view;
    });
    
    it('should be an instance of Backbone.View', function() {
      expect(LoginView).toBeDefined();
      expect(this.view).toEqual(jasmine.any(Backbone.View));
    });
    
    it('should have some key input fields', function() {
      expect(this.emailSSO).toBeDefined();
      expect(this.btnLogin).toBeDefined();
    });

    xit('should submit valid forms', function() {
    });
    
    it('should display error feedback (400)', function() {
      spyOn(this.model, 'save').and.callThrough();

      jasmine.Ajax.stubRequest('/api/v2/login').andReturn({
        status: 400,
        statusText: "Bad Request",
        contentType: "application/json",
        responseText: '{"type":"error","status-code":400,"status":"Bad Request","result":{"message":"please use a valid email address.","kind":"invalid-auth-data","value":{"email":["invalid"]}}}'
      });

      this.emailSSO.val('invalid@email.com');
      this.password.val('pass');

      this.view.$el.find('#btn-login').trigger('click');
      
      expect(this.model.save).toHaveBeenCalled();
      expect(this.view.$el.find('.statusmessage').text()).toMatch('please use a valid email address.');
      // TODO: check also that the element is visible
    });
    
    it('should display error feedback (401)', function() {
      spyOn(this.model, 'save').and.callThrough();

      jasmine.Ajax.stubRequest('/api/v2/login').andReturn({
        status: 400,
        statusText: "Bad Request",
        contentType: "application/json",
        responseText: '{"type":"error","status-code":401,"status":"Unauthorized","result":{"message":"cannot authenticate to snap store: Provided email/password is not correct.","kind":"login-required"}}'
      });

      this.emailSSO.val('valid@email.com');
      this.password.val('wrong');

      this.view.$el.find('#btn-login').trigger('click');
      
      expect(this.model.save).toHaveBeenCalled();
      expect(this.view.$el.find('.statusmessage').text()).toMatch('Provided email/password is not correct.');
      // TODO: check also that the element is visible
    });
    
    it('should set the macaroon cookies', function() {
      spyOn(this.model, 'save').and.callThrough();
      spyOn(this.model, 'setMacaroonCookiesFromResponse').and.callThrough();

      jasmine.Ajax.stubRequest('/api/v2/login').andReturn({
        status: 200,
        statusText: "OK",
        contentType: "application/json",
        responseText: '{"type":"sync","status-code":200,"status":"OK","result":{"macaroon":"protect the innoncent","discharges":["serve the public trust"]}}',
      });
      
      this.emailSSO.val('valid@email.com');
      this.password.val('not empty');
      
      this.view.$el.find('#btn-login').trigger('click');
      
      expect(this.model.save).toHaveBeenCalled();
      expect(this.model.setMacaroonCookiesFromResponse).toHaveBeenCalled();
    });
    
    it('should send the macaroon cookie in new requests', function() {
      this.model.setMacaroonCookiesFromResponse({"macaroon":"protect the innoncent",
                                                 "discharges":["serve the public trust"]});

      var doneFn = jasmine.createSpy("success");
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function(args) {
        if (this.readyState == this.DONE) {
          doneFn(this.responseText);
        }
      };

      xhr.open("GET", "/some/api/call");
      xhr.send();
      
      request = jasmine.Ajax.requests.mostRecent();
      expect(request.url).toBe('/some/api/call');
      expect(request.method).toBe('GET');
      // FIXIME: check the Authorization header is set
      // Note: the request headers are empty, jasmine-ajax doesn't really behave like
      // in a normal browser, where cookies are effectively sent
    });
    
  });

});
