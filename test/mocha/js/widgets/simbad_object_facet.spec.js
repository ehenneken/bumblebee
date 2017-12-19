define([
	'underscore',
    'marionette',
    'backbone',
	'cache',
    'redux',
    'js/widgets/facet/actions',
    'js/widgets/base/base_widget',
    'js/components/api_response',
    'js/components/api_request',
    'js/components/api_query',
    'js/bugutils/minimal_pubsub',
	'js/widgets/facet/factory',
	'js/components/api_query_updater',
	'js/wraps/object_facet'
  ],
  function(
	       _,
           Marionette,
           Backbone,
	       Cache,
	       Redux,
	       Actions,
           BaseWidget,
           ApiResponse,
           ApiRequest,
           ApiQuery,
           MinimalPubSub,
	       FacetFactory,
	       ApiQueryUpdater,
		   ObjectFacet
    ) {
		
    describe("Object Facet Widget (simbad_object_facet.spec.js)", function () {
      var sampleResponse = {
          'responseHeader': {
            'status': 0,
            'QTime': 18,
            'params': {
              'facet.limit': '25',
              'q': 'author:"accomazzi,a"',
              'facet.field': 'simbad_object_facet_hier',
              'fl': 'id',
              'facet.prefix': '0/',
              'sort': 'date desc',
              'facet.mincount': '1',
              'facet': 'true',
              'wt': 'json',
              'facet.offset': '0'
            }
          },
          'response': {
            'numFound': 186,
            'start': 0,
            'docs': [{
                'id': '11310415'
                }, {
                'id': '11266285'
                }, {
                'id': '11121250'
                }, {
                'id': '11057812'
                }
              ]
          },
          'facet_counts': {
            'facet_queries': {},
            'facet_fields': {
              'simbad_object_facet_hier': ['0/Galaxy', 186, '0/Star', 151, '0/Nebula', 146, '0/Other', 142]
            },
            'facet_dates': {},
            'facet_ranges': {}
          }
        };
	  var sampleApiResponse = {
	      "529086": {
	          "id": "529086", 
	          "canonical": "M 101"
	      },
	      "3133169": {
	          "id": "3133169", 
	          "canonical": "GOODS J123725.21+621055.3"
	      }
		};

      var minsub;
      beforeEach(function () {
		
		var _request = function (request) {
			  console.log('checking request...');
			  console.log(request.get("target"));
			  if (request.get("target") == "search/query"){
				  // When we're called as a Solr search, we return Solr stub data
				  if (request.get("query").get("q")[0] == "toplevel"){
					  console.log('retrieving top level Solr stub data...');
					  return sampleResponse;
				  } else {
					  console.log('retrieving next Solr stub data...');
					  var hierarchicalResponse = _.cloneDeep(sampleResponse);
					  hierarchicalResponse.facet_counts.facet_fields.simbad_object_facet_hier = ['1/Galaxy/529086', 5, '1/Galaxy/3133169', 10];
					  var pubsub = this.beehive.getHardenedInstance().getService('PubSub');
					  
					  pubsub.publish(pubsub.DELIVERING_RESPONSE, { toJSON: function () { return hierarchicalResponse; }});
					  return hierarchicalResponse;
				  }
			  } else {
				  // In all other cases we return stub data representing a response 
				  // from the object search micro service
				  console.log('retrieving microservice mock data...')
				  return JSON.parse(JSON.stringify(sampleApiResponse));
			  }
          }
		  var self = this;
        this.minsub = minsub = new (MinimalPubSub.extend({
          request: _request.bind(self.minsub)
        }))({verbose: false,
		  Api: {
			  request: function (req, context) {
		          if (!context) {
		            context = req.get('options');
		          }
		          var defer = $.Deferred();
		          defer.resolve(_request.call(self.minsub, req));
		          return defer.promise();
			  }
		  }});
      });

      
      afterEach(function(){
        document.querySelector("#test-area").innerHTML = '';
      })
      /*
      it("Gets object facet data from Solr docs and clicking populates top level of facet", function() {
		// Create a new SIMBAD Objects facet
        var widget = new ObjectFacet();
		var solr_data = new ToPLevelSolr();
		
		var top_level = $.grep(solr_data.facet_counts.facet_fields.simbad_object_facet_hier, function(elem) {
		    return elem[0] === "0";
		}).map(function(s){return s.slice(2)});

        widget.activate(this.minsub.beehive.getHardenedInstance());

		var $w = $(widget.render().el);
        $('#test-area').append($w);
		window.$w = $w;
        // Initiate a search
        minsub.publish(minsub.START_SEARCH, minsub.createQuery({'q': 'toplevel'}));
        // This results in
		// 1. The initial search query results in Solr stub data being sent to the object facet
		// 2. The hierarchical object facet data in the Solr stub data initiates a call to
		//    the SIMBAD micro service which, through a "call back", results in micro service
		//    stub data being sent back, which will get cached (SIMBAD id as key, SIMBAD object
		//    name as value)
        // We now should have a facet called "SIMBAD Objects"
		expect($("#test-area .facet__container h3").text().trim()).to.eql("SIMBAD Objects");
		// Facet should be closed by default
		expect(widget.store.getState().state.open).to.be.false;
		// Now click to open the top level
		$("#test-area .facet__container").find(".facet__icon--closed").click();
		// We expect 5 entries
		expect($("#test-area .facet__container").find(".facet__list").find('li').length).to.eql(4);
		// Did we get the expected top level facets?
		var observed = $("#test-area .facet__container").find(".facet__list").find('.facet-label__title').map(function(){return this.innerHTML;}).get().filter(function(s){ return !$.isNumeric(s)});
		expect(observed.sort()).to.eql(top_level.sort());

      });
	  */
	  it("Accessing second level of SIMBAD object facet and replace the simbid values with actual names", function(){
		/*
		The SIMBAD Objects hierarchical facet functions as follows
		  1. After query, on the results page, the facet is initially closed
		  2. Clicking on the closed facet will open it, showing the top level facet names and document counts
		     (the top level facets are named "0/Galaxy", "0/Star", "0/Nebula" etc etc). The data to populate these
		     top level facets is retrieved by doing a Solr facet request
		  3. Clicking on a top level facet (like "Galaxy") will fire off another Solr facet query, which will return
		     the data for the 2nd level facet entries. These will have forms like "1/Galaxy/529086".
		  4. The 2nd level facet entries will trigger a request to the object_service microservice, which will send back JSON
		     with entries like
		  
	              "529086": {
	                 "id": "529086", 
	                 "canonical": "M 101"
	               }
		  
		     and the value in the "canonical" attribute will be used as display value of the 2nd level facet.
		  
		*/
	  	var widget = new ObjectFacet();
		
		/* Questions
		  FYI - I've been running this test using (I added the appropriate entry to suites.js)
		
		     http://localhost:8000/test/mocha/tests.html?bbbSuite=object
		
		  1. Would it be cleaner to do something along the lines of
		
		       var widget = new ObjectFacet();
               var minsub = new (MinSub.extend({
                   request: function (apiRequest) {
                       return {some: 'foo'}
                   }
                }))({verbose: false});
                minsub.beehive.removeService("Api");
                minsub.beehive.addService("Api", mockAPI);
		
		     where mockAPI would be a function very similar to the beforeEach function?
		  2. I tried the approach in 1. and it seems to be giving me the same problem. The first two steps work (populating the facets),
		     but when it is time to contact the microservice (line 73, "translateSimbid", in the object_facet wrap), I get a TypeError
		      (Cannot read property 'request' of undefined), refering to
		
		      this.getBeeHive().getService("Api").request(request);
		
		     (line 117 in the object_facet.js wrap). It's as if the beehive has lost the "Api" service.
		*/
		
		widget.activate(this.minsub.beehive.getHardenedInstance());
		
		$('#test-area').append(widget.render().el);
		
		minsub.publish(minsub.INVITING_REQUEST, minsub.createQuery({'q': 'toplevel'}));
        
		widget.store.dispatch(widget.actions.data_received(sampleResponse));
		widget.store.dispatch(widget.actions.fetch_data());
		
		var hierarchicalResponse = _.cloneDeep(sampleResponse);
		hierarchicalResponse.facet_counts.facet_fields.simbad_object_facet_hier = ['1/Galaxy/529086', 5, '1/Galaxy/3133169', 10]
		
		widget.store.dispatch(widget.actions.data_requested());
		widget.store.dispatch(widget.actions.data_received(hierarchicalResponse, '0/Galaxy'));
		
		expect($('#test-area').find('.facet__icon:first').hasClass('facet__icon--closed')).to.be.true;
		expect($('#test-area').find('.facet__icon:first').hasClass('facet__icon--open')).to.be.false;
		
        widget.store.dispatch(widget.actions.toggle_facet());

        expect($('#test-area').find('.facet__icon:first').hasClass('facet__icon--closed')).to.be.false;
        expect($('#test-area').find('.facet__icon:first').hasClass('facet__icon--open')).to.be.true;
		
        expect(widget.store.getState().state.selected).to
          .eql([]);
		  
		widget.store.dispatch(widget.actions.select_facet('0/Galaxy'));
		
        expect(widget.store.getState().state.selected).to
          .eql([
          "1/Galaxy/529086",
          "1/Galaxy/3133169",
          "0/Galaxy"
        ]);
		
		widget.setCurrentQuery(minsub.createQuery({ q: 'star' }));
        
		widget.store.dispatch(widget.actions.fetch_data('1/Galaxy/529086'));
		
	  });


    })
  });