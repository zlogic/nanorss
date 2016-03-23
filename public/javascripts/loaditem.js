$(document).ready(function() {
  $('.collapse').on('shown.bs.collapse', function() {
    var placeholder = jQuery(this);
    $.get(placeholder.attr('data-fetchurl'), function(data) {
      if(placeholder.attr('aria-expanded') === "true")
        placeholder.append(data);
      else
        placeholder.empty();
    });
  });
  $('.collapse').on('hidden.bs.collapse', function() {
    jQuery(this).empty();
  });
});
