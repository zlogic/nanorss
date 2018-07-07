var authData = {
  token: undefined,
  loginForm: undefined,
  updateLoginForm: function() {
    if(this.loginForm === undefined)
      return;
    if(this.token === undefined)
      this.loginForm.prop("hidden", false);
    else
      this.loginForm.prop("hidden", true);
  },
  setToken: function(token, saveToken) {
    this.token = token;
    try {
      if(saveToken)
        localStorage.setItem("nanorss_access_token", token);
      else
        localStorage.removeItem("nanorss_access_token");
    } catch (err) {}
    this.updateLoginForm();
  },
  loadToken: function() {
    try {
      this.token = localStorage["nanorss_access_token"];
    } catch (err) {}
    this.updateLoginForm();
  },
  forgetToken: function() {
    this.token = undefined;
    try {
      localStorage.removeItem("nanorss_access_token");
    } catch (err) {}
    this.updateLoginForm();
  },
  get: function(url) {
    var token = this.token;
    return $.ajax({
      url: url,
      type: 'GET',
      beforeSend: function(xhr) { xhr.setRequestHeader( "Authorization", "Bearer " + token); }
    });
  },
  post: function(url, data) {
    var token = this.token;
    return $.ajax({
      url: url,
      type: 'POST',
      data: data,
      beforeSend: function(xhr) { xhr.setRequestHeader( "Authorization", "Bearer " + token); }
    });
  }
};

$(document).ready(function() {
  authData.loginForm = $("#login");
  authData.loadToken();
  // Select some elements before we get uncontrolled third-party content
  var divContent = $("#content");
  //Content loader
  var loadContent = function() {
    if(authData.token === undefined)
      return;
    var request = authData.get("user");
    request.done(function(data) {
      // Add content
      divContent.empty();
      divContent.append(data);
      // Add handlers for loading items
      // Expand item
      $('.expandable-item.collapse').on('shown.bs.collapse', function() {
        var placeholder = jQuery(this);
        placeholder.children(".progress").hide();
        var target = placeholder.children("#item");
        target.hide().empty();
        $.get(placeholder.attr('data-fetchurl'), function(data) {
          target.empty();
          target.append(data);
          target.slideDown();
        });
      });
      // Collapse item
      $('.collapse.expandable-item').on('hidden.bs.collapse', function() {
        var placeholder = jQuery(this);
        placeholder.children(".progress").show();
        placeholder.children("#item").empty().hide();
      });
      // Add handlers for configuration
      var configurationCollapsible = $('#configuration.collapse');
      var opml = $('textarea[name="opml"]');
      var pagemonitor = $('textarea[name="pagemonitor"]');
      var username = $('input[id="editUsername"]');
      var password = $('input[id="editPassword"]');
      var lockConfiguration = function(){
        [opml, pagemonitor, username, password].forEach(function(control){
          control.attr('disabled', true);
          control.val('');
        })
      }
      lockConfiguration();
      // Expand configuration
      configurationCollapsible.on('shown.bs.collapse', function() {
        lockConfiguration();
        var request = authData.get("user/configuration")
        request.done(function(data) {
          username.val(data.username);
          username.attr('disabled', false);
          password.attr('disabled', false);
          opml.val(data.opml);
          opml.attr('disabled', false);
          pagemonitor.val(data.pagemonitor);
          pagemonitor.attr('disabled', false);
        });
      });
      // Collapse configuration
      configurationCollapsible.on('hidden.bs.collapse', function() {
        lockConfiguration();
      });
      // Submit configuration handler
      $("#configurationForm").submit(function(event) {
        event.preventDefault();
        // Prepare request
        var $form = $(this);
        var postData = {username: username.val(), password: password.val(), opml: opml.val(), pagemonitor: pagemonitor.val()};
        if(postData.password === null || postData.password === undefined || postData.password === '')
          delete postData.password;
        var posting = authData.post("user/configuration", postData);
        //Handle responses
        posting.done(function(data) {
          configurationCollapsible.collapse('hide');
        });
        posting.fail(function() {
          location.reload();
        });
      });
    });
    request.fail(function(err) {
      if(err.status === 401)
        authData.forgetToken();
      location.reload();
    });
  };
  loadContent();

  // Login form handler
  $("#loginForm").submit(function(event) {
    event.preventDefault();
    authData.forgetToken();
    // Prepare request
    var $form = $(this);
    $form.find("#loginFailed").prop("hidden", true);
    var username = $form.find("input[id='inputUsername']").val();
    var password = $form.find("input[id='inputPassword']").val();
    var rememberMe = $form.find("input[id='rememberMe']").prop('checked');
    var posting = $.post("oauth/token", {username: username, password: password, grant_type: "password"}, "json");
    //Handle responses
    posting.done(function(data) {
      authData.setToken(data.access_token, rememberMe);
      loadContent();
    });
    posting.fail(function() {
      $form.find("#loginFailed").prop("hidden", false);
    });
  });

});
