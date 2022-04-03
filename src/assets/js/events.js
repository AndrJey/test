import helpers from './helpers.js';

window.addEventListener( 'load', () => {
    //Когда щелкают значок чата
    document.querySelector( '#toggle-chat-pane' ).addEventListener( 'click', ( e ) => {
        let chatElem = document.querySelector( '#chat-pane' );
        let mainSecElem = document.querySelector( '#main-section' );

        if ( chatElem.classList.contains( 'chat-opened' ) ) { // если чат открыт
            chatElem.setAttribute( 'hidden', true ); //скрываем чат
            mainSecElem.classList.remove( 'col-md-9' );
            mainSecElem.classList.add( 'col-md-12' );
            chatElem.classList.remove( 'chat-opened' );
        }

        else {
            chatElem.attributes.removeNamedItem( 'hidden' ); // если чат скрыт, открываем чат
            mainSecElem.classList.remove( 'col-md-12' );
            mainSecElem.classList.add( 'col-md-9' );
            chatElem.classList.add( 'chat-opened' );
        }

        //удалите значок «Новый» на значке чата (если есть) после открытия чата
        setTimeout( () => {
            if ( document.querySelector( '#chat-pane' ).classList.contains( 'chat-opened' ) ) {
                helpers.toggleChatNotificationBadge();
            }
        }, 300 );
    } );


    //При щелчке на значок включить "картинка в картинке"
    document.getElementById( 'local' ).addEventListener( 'click', () => {
        if ( !document.pictureInPictureElement ) {
            document.getElementById( 'local' ).requestPictureInPicture()
                .catch( error => {
                    // Видео не удалось перейти в режим «Картинка в картинке»
                    console.error( error );
                } );
        }

        else {
            document.exitPictureInPicture()
                .catch( error => {
                    // Видео не удалось выйти из режима «Картинка в картинке»
                    console.error( error );
                } );
        }
    } );


    //Когда нажата кнопка "Создать комнату"
    document.getElementById( 'create-room' ).addEventListener( 'click', ( e ) => {
        e.preventDefault();

        let roomName = document.querySelector( '#room-name' ).value;
        let yourName = document.querySelector( '#your-name' ).value;

        if ( roomName && yourName ) {
            //удалить сообщение об ошибке, если есть
            document.querySelector( '#err-msg' ).innerHTML = "";

            //сохранить имя пользователя в sessionStorage
            sessionStorage.setItem( 'username', yourName );

            //создать ссылку на комнату
            let roomLink = `${ location.origin }?room=${ roomName.trim().replace( ' ', '_' ) }_${ helpers.generateRandomString() }`;

            //показать сообщение со ссылкой на комнату
            document.querySelector( '#room-created' ).innerHTML = `Комната успешно создана. Ссылка на <a href='${ roomLink }'>комнату</a>.`;

            //очистить значения
            document.querySelector( '#room-name' ).value = '';
            document.querySelector( '#your-name' ).value = '';
        }

        else {
            document.querySelector( '#err-msg' ).innerHTML = "All fields are required";
        }
    } );


    //Когда нажата кнопка «Войти в комнату»
    document.getElementById( 'enter-room' ).addEventListener( 'click', ( e ) => {
        e.preventDefault();

        let name = document.querySelector( '#username' ).value;

        if ( name ) {
            //удалить сообщение об ошибке, если есть
            document.querySelector( '#err-msg-username' ).innerHTML = "";

            //сохранить имя пользователя в sessionStorage
            sessionStorage.setItem( 'username', name );

            //перезагрузить комнату
            location.reload();
        }

        else {
            document.querySelector( '#err-msg-username' ).innerHTML = "Please input your name";
        }
    } );


    document.addEventListener( 'click', ( e ) => {
        if ( e.target && e.target.classList.contains( 'expand-remote-video' ) ) { // если нажато развернуть видео
            helpers.maximiseStream( e ); // раскрываем на весь экран
        }

        else if ( e.target && e.target.classList.contains( 'mute-remote-mic' ) ) { // если нажато отключенить микрофон
            helpers.singleStreamToggleMute( e ); // выключаем микрофон
        }
    } );


    document.getElementById( 'closeModal' ).addEventListener( 'click', () => {
        helpers.toggleModal( 'recording-options-modal', false );
    } );
} );
