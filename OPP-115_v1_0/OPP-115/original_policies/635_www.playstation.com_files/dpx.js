(function(win) {

    var hostname_as_int = parseInt((location.hostname || "local").substring(0,10), 36);

    if (typeof win['dpx_'+hostname_as_int] != 'undefined') {
        win['dpx_'+hostname_as_int].run();
        return;
    }

    var dpx = {
        sifi_pixel_url: '//i.simpli.fi/dpx?',
        pixels_url: 'http://i.simpli.fi/p?',
        pixels: [],
        matching_pixels: [],
        protocol: (location.protocol == 'https:') ? 'https:' : "http:",
        pixels_to_drop: [],
        dropping_pixels: false,
        rescue_pixel: null,
        company_id: '',

        run: function() {
            dpx.drop_pixels();
        },

        drop_pixels: function() {
            var sifi_pixels = dpx.get_sifi_pixels();
            for (var i = sifi_pixels.length-1; i >= 0; i--) {
                dpx.add_sifi_pixel(sifi_pixels[i]);
            }
            if (dpx.does_allow_matching() && !dpx.already_dropped_matching) {
                dpx.get_matching_pixels();
            } else {
                dpx._drop_matching_pixels();
            }
        },

        get_sifi_pixels: function() {
            var nodes = document.scripts || document.getElementsByTagName('script'),
                pixels = [];
            for (var i = nodes.length-1; i >= 0; i--) {
                var node = nodes[i],
                    src = node.src || '';
                if (src.indexOf('/dpx.js') > 0 && !node.getAttribute('data-sifi-parsed')) {
                    node.setAttribute('data-sifi-parsed', true);
                    var params = dpx.get_query_string(src);
                    dpx.company_id = (params.match(/cid=(\d+)/) || [])[1] || dpx.company_id
                    pixels.push(params);
                    dpx.pixels.push(params);
                }
            }
            return pixels;
        },

        add_sifi_pixel: function(params) {
            params += "&cbri=" + Math.floor(Math.random()*(new Date().getTime()));
            params += "&referrer=" + escape(document.referrer);
            dpx.pixels_to_drop.push(dpx.sifi_pixel_url + params);
        },

        get_matching_pixels: function() {
            var script = document.createElement('script');
            script.src = dpx.pixels_url + 'cid=' + dpx.company_id + '&cb=dpx_' + hostname_as_int + '._hp';
            document.body.appendChild(script);
        },

        get_query_string: function(src) {
            var str = src.substr(src.indexOf('dpx.js?')+7);
            return str;
        },

        _hp: function(pixels) {
            dpx.matching_pixels = pixels && pixels['pixels'] || [];
            dpx._drop_matching_pixels();
        },

        _drop_matching_pixels: function() {
            if (dpx.does_allow_matching() && !dpx.already_dropped_matching) {
                for (var i = dpx.matching_pixels.length-1; i >= 0; i--) {
                    dpx.pixels_to_drop.push(dpx.matching_pixels[i]);
                }
                dpx.already_dropped_matching = true;
            }
            dpx._next_pixel();
        },

        _next_pixel: function() {
            if (dpx.pixels_to_drop.length == 0) return;
            var src = dpx.pixels_to_drop.shift(),
                img = new Image();
            img.onload = img.onerror = function() {
              dpx.rescue_pixel = null;
              dpx._next_pixel();
            };
            img.src = dpx.protocol + src;

            dpx.rescue_pixel = setTimeout(function() {
              img.onload = img.onerror = null;
              dpx._next_pixel();
            },1000);
        },

        does_allow_matching: function() {
            if (typeof dpx.allow_matching != 'undefined') return dpx.allow_matching;

            if (dpx.protocol == 'https:') {
                dpx.allow_matching = false;
                return false;
            }

            for (var i = dpx.pixels.length-1; i >= 0; i--) {
                var params = dpx.pixels[i];
                if (params.indexOf('m=0') > 0) {
                    dpx.allow_matching = false;
                    return false;
                }
            }

            dpx.allow_matching = true;
            return true;
        }
    };

    win['dpx_'+hostname_as_int] = dpx;

    if (!document.body) {
        if (window.addEventListener) {
            window.addEventListener('load', dpx.run, false);
        } else if (window.attachEvent) {
            window.attachEvent('onload', dpx.run);
        }
    } else {
        dpx.run();
    }

})(window);
