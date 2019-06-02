//
// Copyright (c) KennyDaren.me and contributors.
// Licensed under the MIT license. See LICENSE file in the project root for details.
//

const TEXT_MAX_LENGTH = 80;
const URL_MAX_LENGTH = 100;

const callbacks = new Map();

document.addEventListener('DOMContentLoaded', function () {
    initAddContainer();

    loadHistory();
});

function loadHistory() {
    document.getElementById('main').innerHTML = '';

    chrome.storage.sync.get('settings', function (data) {
        if (!data.settings || data.settings.length <= 0) {
            addHistory('', 5);
        } else {
            for (let item of data.settings) {
                addHistory(item.search, item.limit, undefined, true);
            }
        }
    });
}

function initAddContainer() {
    const showAdd = document.getElementById('show-add');
    const addContainer = document.getElementById('add-container');
    const phraseInput = document.getElementById('phrase');
    const limitInput = document.getElementById('limit');
    const addButton = document.getElementById('add');

    showAdd.onclick = function () {
        if (addContainer.style.display === 'none') {
            addContainer.style.display = 'block';
            return;
        }
        addContainer.style.display = 'none';
    };

    addButton.onclick = function () {
        const limit = parseInt(limitInput.value);
        let search = phraseInput.value;

        addContainer.style.display = 'none';
        phraseInput.value = '';
        document.getElementById('list').innerHTML = '';

        chrome.storage.sync.get('settings', function (data) {
            let items = data.settings ? data.settings : [];

            items.push({
                search: search,
                limit: limit
            });

            chrome.storage.sync.set({'settings': items}, function () {
                loadHistory();
            })
        });
    };

    let timeout;
    phraseInput.onkeyup = limitInput.onchange = function () {
        const limit = parseInt(limitInput.value);

        timeout && clearTimeout(timeout);
        timeout = setTimeout(function () {
            document.getElementById('list').innerHTML = '';
            addHistory(phraseInput.value, limit, 'list');
        }, 250);
    }
}

function addHistory(search, limit, tag, allowRemove) {
    limit = limit ? limit : 5;
    tag = tag ? tag : 'main';

    let el = document.getElementById(tag);

    chrome.history.search({text: search, maxResults: limit}, (historyItems) => {
        el.innerHTML +=
            '<div class="title">' +
            `<h2>${search ? search : 'Latest'}:</h2>` +
            (allowRemove ? `<a href="#" data-remove="${search}" title="Remove"><img src="assets/remove.svg" alt="Remove"/></a>` : '') +
            '</div>' +
            '<div style="clear: both"></div>';

        let items = '<ul>';
        for (let historyItem of historyItems) {
            const {url, title} = historyItem;
            const shortenedUrl = shortUrl(url);
            const shortenedTitle = shortTitle(title, shortenedUrl);

            items +=
                '<li>' +
                `<a target='_newtab' href="${url}" class="url"><strong>${shortenedTitle}</strong><br>` +
                `<small>${shortenedUrl}</small>` +
                '</a>' +
                '</li>';
        }

        items += '</ul>';


        el.innerHTML += items;

        registerRemoveCallbacks();
    });

}

function registerRemoveCallbacks() {
    const removeElements = document.querySelectorAll('[data-remove]');

    callbacks.forEach(
        function (e, el) {
            el.removeEventListener('click', e)
        }
    );

    callbacks.clear();

    for (let el of removeElements) {
        const listener = function (e) {
            const searchPhrase = e.target.getAttribute('data-remove');
            console.log('sp', searchPhrase);

            chrome.storage.sync.get('settings', function (data) {
                let items = data.settings ? data.settings : [];

                for (let i in items) {
                    if (items[i].search === searchPhrase) {
                        delete items[i];
                        break;
                    }
                }

                chrome.storage.sync.set({'settings': items.filter(Boolean)}, function () {
                    loadHistory();
                })
            });
        };

        el.addEventListener('click', listener);
        callbacks.set(el, listener);
    }
}

function shortUrl(url, length) {
    length = length ? length : URL_MAX_LENGTH;
    return url.length > length ? decodeURI(url.slice(0, length - 3)) + '...' : decodeURI(url);
}

function shortTitle(title, url) {
    length = length ? length : TEXT_MAX_LENGTH;

    if (title.length <= 0) {
        return shortUrl(url, length);
    }

    return title.length > length ? title.slice(0, length - 3) + '...' : title;
}
