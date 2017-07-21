/*eslint-disable */
module.exports = function (onUpdate) {
    ///todo: write a modal window on browser to illustrate loading of livereload

    var GLOBAL_VAR_NAME = "__spacecms_global";

    var throwError = function (err) {
        console.error("CMS Live Reload Failure Occurred");
        console.trace("CMS Live Reload Error: ", err);
    };

    try {

        //todo: transform to Promise format
        var loadScript = function (url, callback) {

            var script = document.createElement("script");
            script.type = "text/javascript";

            if (script.readyState) { //IE
                script.onreadystatechange = function () {
                    if (script.readyState === "loaded" || script.readyState === "complete") {
                        script.onreadystatechange = null;
                        callback();
                    }
                };
            } else { //Others
                script.onload = function () {
                    callback();
                };
            }

            script.src = url;
            document.getElementsByTagName("head")[0].appendChild(script);
        };


        //todo: check if already loaded already before attempting load
        loadScript('//ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js', function () {

            if (typeof window.jQuery === "undefined") throw("jQuery failed to load");

            loadScript('//cdn.bootcss.com/twig.js/0.8.9/twig.js', function onLoadTwig() {
                loadScript('//cdnjs.cloudflare.com/ajax/libs/sails.io.js/1.1.10/sails.io.min.js', function onLoadSailsIo() {

                    var gn = GLOBAL_VAR_NAME;

                    if (!window[gn]) {
                        throwError("Global Variables not loaded");
                        return;
                    }



                    var API_URL = window[gn].config.api_url;

                    var SPACE_UPDATE_COOLDOWN = window[gn].space_update_cooldown;
                    io.sails.url = API_URL;

                    var _spaceData = window[gn].space;
                    var _spaceUpdateCooldownTimeout;

                    jQuery(document).ready(function () {

                        var $body = jQuery(window.document.body);

                        var template = twig({
                            id: "body",
                            //href: "templates/posts.twig",
                            // for this example we'll block until the template is loaded
                            async: false
                            , data: $body.html()
                            // The default is to load asynchronously, and call the load function
                            //   when the template is loaded.
                            /*, load: function(template) {
                             console.log("embed-head-snippet.html:load (39)","loading tmp",template);//fordebug: debug print
                             }*/
                        });

                        var _previouslyRenderedSpaceData={};

                        var _render = function () {

                            var h = twig({ref: "body"}).render({space: _spaceData,md:Math.random()});

                            //console.log("_cms-livereload.js:_render (85)",h);//fordebug: debug print

                            $body[0].innerHTML=h;

                            var $scripts=   jQuery('script:not([src],[id])',$body).detach();//avoid browsersync injection and ext. libraries


                            $scripts.appendTo($body);

                            //
                            // $scripts.appendTo('body');

                            //$body.append($scripts);

                            window[gn].space=_spaceData;
                            window['_space']=_spaceData;

                            _previouslyRenderedSpaceData=_spaceData;

                            if (typeof onUpdate==="function")
                                onUpdate(_spaceData);

                        };

                        var mapSpacesArrayToAssoc = function (spacesArray) {
                            var m = {};

                            spacesArray.forEach(function (space) {

                                m[space.uri_label] = Object.assign({}, space.formData);

                            });

                            return m;
                        };

                        //$body.html('Loading Dev Environment...');

                        jQuery.ajax({
                            method: 'GET',
                            url: API_URL + 'project/?uri_label=' + window[gn].project.name
                        }).then(function (data) {

                            return data[0];

                        }).then(function (project) {

                            project=project[0];

                            return jQuery.ajax({method: 'GET', url: API_URL + 'space/?project=' + project.id}).then(function (spaces,r,s) {

                                spaces.forEach(function (space) {
                                    //_spaceData[space.uri_label] = Object.assign(_spaceData[space.uri_label] || {}, space.formData);
                                    io.socket.get('/space/' + space.uri_label + '/subscribe');
                                });

                                _spaceData = mapSpacesArrayToAssoc(spaces);

                                return true;

                            }).then(function () {

                                io.socket.on('space', function onSpaceUpdate(Space) {

                                    clearTimeout(_spaceUpdateCooldownTimeout);
                                    _spaceUpdateCooldownTimeout = setTimeout(function () {
                                        _spaceData[Space.data[0].uri_label] = Object.assign(_spaceData[Space.data[0].uri_label] || {}, Space.data[0].formData);
                                        _render();
                                    }, SPACE_UPDATE_COOLDOWN);

                                });

                                return _render();

                            });

                        }).then(function(){
                            //complete
                        })


                    });

                });

            });

        });


    } catch (err) {
        throwError(err);
    }


};
/*eslint-enable */

