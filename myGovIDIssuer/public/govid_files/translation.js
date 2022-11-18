'use strict';

var data = {};

function getCookie(cname) {
  var name = cname + '=';
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
}

function LoadTranslation() {
  var lang = getCookie(_siteSettings.govCookieName);

  if (arguments.length > 0 && arguments[0] !== undefined) {
    lang = arguments[0];
    document.cookie =
      _siteSettings.govCookieName +
      '=' +
      lang +
      ';expires=Fri, 31 Dec 9999 23:59:59 GMT; domain=' +
      _siteSettings.govCookieDomain +
      ';path=/';
  } else {
    if (lang == '') {
      lang = 'he';
      document.cookie =
        _siteSettings.govCookieName +
        '=' +
        lang +
        ';expires=Fri, 31 Dec 9999 23:59:59 GMT; domain=' +
        _siteSettings.govCookieDomain +
        ';path=/';
    }
  }

  _curLang = lang;
  if (_siteSettings.forgottenPasswordLink.includes('?')) {
    if (_siteSettings.forgottenPasswordLink.includes('locale'))
      _siteSettings.forgottenPasswordLink = _siteSettings.forgottenPasswordLink.replace(
        /(\?|&)locale=[a-z0-9\-]+\&?/,
        '&locale=' + (_curLang == 'he' ? 'iw' : _curLang)
      );
    else
      _siteSettings.forgottenPasswordLink =
        _siteSettings.forgottenPasswordLink +
        '&locale=' +
        (_curLang == 'he' ? 'iw' : _curLang);
  } else {
    _siteSettings.forgottenPasswordLink =
      _siteSettings.forgottenPasswordLink +
      '?locale=' +
      (_curLang == 'he' ? 'iw' : _curLang);
  }

  if (_siteSettings.signupLink.includes('?')) {
    if (_siteSettings.signupLink.includes('locale'))
      _siteSettings.signupLink = _siteSettings.signupLink.replace(
        /(\?|&)locale=[a-z0-9\-]+\&?/,
        '&locale=' + (_curLang == 'he' ? 'iw' : _curLang)
      );
    else
      _siteSettings.signupLink =
        _siteSettings.signupLink +
        '&locale=' +
        (_curLang == 'he' ? 'iw' : _curLang);
  } else {
    _siteSettings.signupLink =
      _siteSettings.signupLink +
      '?locale=' +
      (_curLang == 'he' ? 'iw' : _curLang);
  }

  console.log(_siteSettings.signupLink);

  window.recaptchaOptions = {
    lang: lang,
  };
  if (window.grecaptcha) {
    try {
      window.grecaptcha.reset();
    } catch (error) {}
  }

  return new Promise(function(resolve, reject) {
    fetch('./translations/' + lang + '.json', {
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(function(res) {
        if (res.status === 200) {
          return res.json();
        } else {
          console.warn('failed to get ./' + lang + '.json');
          reject();
        }
      })
      .then(function(json) {
        $.extend(data, json);
        if (data.customCSS) {
          $('link[custom]').attr('href', data.customCSS);

          fetch('./' + data.customCSS).then(function(res) {
            if (res.status === 404) {
              console.error(data.customCSS + ' custom css not found');
            }
          });
        }
        resolve();
      })
      .catch(function(error) {
        return reject(error);
      });
    if (lang === 'he' || lang == 'ar') {
      rtl = true;
    } else rtl = false;
    changeDir();
  });
}

function Translate(key) {
  if (data[key]) {
    return data[key].trim();
  } else {
    return '';
  }
}

$(function() {
  changeDir();
});

function changeDir() {
  if (rtl) {
    $('body').attr('dir', 'rtl');
    $('body').attr('class', 'body-rtl');
  } else {
    $('body').attr('dir', 'ltr');
    $('body').attr('class', 'body-ltr');
  }
}
