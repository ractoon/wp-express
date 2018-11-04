$(document).foundation();

$(document).ready(function() {
  if ($('#slides').length) {
	  $("#slides").owlCarousel({
	    singleItem : true,
	    itemsScaleUp : false,
	    slideSpeed : 200,
	    paginationSpeed : 800,
	    rewindSpeed : 1000,
	    autoPlay : false,
	    stopOnHover : false,
	    autoHeight : true,
	    pagination: true,
	    paginationNumbers: true
	  });
	}

	$('.image-link').magnificPopup({
		type:'image'
	});

	$('.step-item').magnificPopup({
	  type: 'image',
	  image: {
		  titleSrc: function(item) {
		  	var title = '';

		  	item.el.nextAll('p').each(function(i, el) {
	    		title += '<p>' + $(el).html() + '</p>';
				});
		  
		  	return title;
		  }
	  },
	  gallery: {
	    enabled: true
	  }
	});

	$('.faq-item').magnificPopup({
	  type: 'image',
	  gallery: {
	    enabled: true
	  }
	});
});