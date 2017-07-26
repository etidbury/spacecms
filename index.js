/*eslint-disable */
SpaceCMSClient = function (onUpdate) {
    ///todo: write a modal window on browser to illustrate loading of livereload
    ///todo: add handler when injecting this library more than once. i.e. when user imports library in their react project
    var GLOBAL_VAR_NAME = "__spacecms_global";

    var throwError = function (err) {
        console.error("CMS Live Reload Failure Occurred");
        console.trace("CMS Live Reload Error: ", err);
    };

    try {

        /*------deepmerge----*/
        function isMergeableObject(val) {
            var nonNullObject = val && typeof val === 'object'

            return nonNullObject
                && Object.prototype.toString.call(val) !== '[object RegExp]'
                && Object.prototype.toString.call(val) !== '[object Date]'
        }

        function emptyTarget(val) {
            return Array.isArray(val) ? [] : {}
        }

        function cloneIfNecessary(value, optionsArgument) {
            var clone = optionsArgument && optionsArgument.clone === true
            return (clone && isMergeableObject(value)) ? deepmerge(emptyTarget(value), value, optionsArgument) : value
        }

        function defaultArrayMerge(target, source, optionsArgument) {
            var destination = target.slice()
            source.forEach(function (e, i) {
                if (typeof destination[i] === 'undefined') {
                    destination[i] = cloneIfNecessary(e, optionsArgument)
                } else if (isMergeableObject(e)) {
                    destination[i] = deepmerge(target[i], e, optionsArgument)
                } else if (target.indexOf(e) === -1) {
                    destination.push(cloneIfNecessary(e, optionsArgument))
                }
            })
            return destination
        }

        function mergeObject(target, source, optionsArgument) {
            var destination = {}
            if (isMergeableObject(target)) {
                Object.keys(target).forEach(function (key) {
                    destination[key] = cloneIfNecessary(target[key], optionsArgument)
                })
            }
            Object.keys(source).forEach(function (key) {
                if (!isMergeableObject(source[key]) || !target[key]) {
                    destination[key] = cloneIfNecessary(source[key], optionsArgument)
                } else {
                    destination[key] = deepmerge(target[key], source[key], optionsArgument)
                }
            })
            return destination
        }

        function deepmerge(target, source, optionsArgument) {
            var array = Array.isArray(source);
            var options = optionsArgument || {arrayMerge: defaultArrayMerge}
            var arrayMerge = options.arrayMerge || defaultArrayMerge

            if (array) {
                return Array.isArray(target) ? arrayMerge(target, source, optionsArgument) : cloneIfNecessary(source, optionsArgument)
            } else {
                return mergeObject(target, source, optionsArgument)
            }
        }

        deepmerge.all = function deepmergeAll(array, optionsArgument) {
            if (!Array.isArray(array) || array.length < 2) {
                throw new Error('first argument should be an array with at least two elements')
            }

            // we are sure there are at least 2 values, so it is safe to have no initial value
            return array.reduce(function (prev, next) {
                return deepmerge(prev, next, optionsArgument)
            })
        }
        /*------/deepmerge----*/


        //todo: transform to Promise format
        var loadScript = function (url, isAlreadyLoaded, callback) {
            if (isAlreadyLoaded) {
                callback();
                return;
            }

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


        //todo: check correct versions have loaded for each library

        loadScript('//ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js', typeof window.jQuery !== "undefined", function () {
            loadScript('//cdn.bootcss.com/twig.js/0.8.9/twig.js', typeof window.twig !== "undefined" && typeof window.twig === "function", function onLoadTwig() {
                loadScript('//cdnjs.cloudflare.com/ajax/libs/sails.io.js/1.1.10/sails.io.min.js', typeof window.io !== "undefined" && typeof window.io.sails !== "undefined", function onLoadSailsIo() {

                    var gn = GLOBAL_VAR_NAME;

                    if (!window[gn]) {
                        throwError("Global Variables not loaded");
                        return;
                    }


                    var API_URL = window[gn].config.api_url;

                    io.sails.url = API_URL;

                    var _spaceData = window[gn].space;
                    var _spaceUpdateCooldownTimeout;

                    jQuery(document).ready(function () {

                        var $body = jQuery(window.document.body);

                        var bodyTemplate = twig({
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

                        var _previouslyRenderedSpaceData = {};

                        var _render = function () {

                            //var h = twig({ref: "body"}).render({space: _spaceData,md:Math.random()});

                            //console.log("_cms-livereload.js:_render (85)",h);//fordebug: debug print

                            var h = bodyTemplate.render({space: _spaceData, md: Math.random()});

                            $body[0].innerHTML = h;

                            var $scripts = jQuery('script:not([async],[id])', $body).detach();//avoid browsersync injection and ext. libraries


                            //
                            // $scripts.appendTo('body');

                            //$body.append($scripts);

                            console.log("index.js:zzzzzzzzzz (102)", window[gn].space.quiz_theme.background_color.value);//fordebug: debug print

                            window[gn].space = _spaceData;

                            window['_space'] = _spaceData;

                            console.log("index.js:yyyyyyyyyy (102)", window[gn].space.quiz_theme.background_color.value);//fordebug: debug print


                            console.log("index.js:render (105)", _spaceData);//fordebug: debug print

                            _previouslyRenderedSpaceData = _spaceData;


                            $scripts.appendTo($body);

                            window.dispatchEvent(new CustomEvent('spacecms:update', {detail: _spaceData}));


                            if (typeof onUpdate === "function")
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

                            project = project[0];

                            return jQuery.ajax({
                                method: 'GET',
                                url: API_URL + 'space/?project=' + project.id
                            }).then(function (spaces, r, s) {

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
                                    }, window[gn].config.space_update_cooldown || 0);

                                });

                                //return _render();
                                return jQuery.ajax({
                                    method: 'GET',
                                    url: API_URL + 'project/' + window[gn].project.name + '/spaces'
                                });


                            }).then(function (updatedSpaceData) {

                                console.log("index.js:before (172)", _spaceData);//fordebug: debug print

                                _spaceData = mapSpacesArrayToAssoc(updatedSpaceData);

                                console.log("index.js:after (174)", _spaceData);//fordebug: debug print

                                _render();

                            });
                            //todo: add error handling

                        }).then(function () {
                            //complete
                        })


                    });//end jQuery.ready

                });//end load io.sails

            });//end load twig

        });//end load jquery


    } catch (err) {
        throwError(err);
    }



};

if (typeof exports === "undefined") {
    exports = this;
    SpaceCMSClient();
} else {
    module.exports = SpaceCMSClient;
}
/*eslint-enable */

