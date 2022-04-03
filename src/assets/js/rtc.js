
import h from './helpers.js'; // импортируем файл helpers
//добавляем прослушиватель событий после того как все загрузится
window.addEventListener( 'load', () => {
    const room = h.getQString( location.href, 'room' );  //  ссылка на комнату
    const username = sessionStorage.getItem( 'username' ); // имя пользователя

    if ( !room ) { // если нет комнаты, открываем ее 
        document.querySelector( '#room-create' ).attributes.removeNamedItem( 'hidden' );
    }

    else if ( !username ) { //если нет имени, показываем его
        document.querySelector( '#username-set' ).attributes.removeNamedItem( 'hidden' );
    }

    else { // если все есть, работаем
        let commElem = document.getElementsByClassName( 'room-comm' );

        for ( let i = 0; i < commElem.length; i++ ) {
            commElem[i].attributes.removeNamedItem( 'hidden' );
        }

        var pc = [];

        let socket = io( '/stream' );

        var socketId = '';
        var randomNumber = `__${h.generateRandomString()}__${h.generateRandomString()}__`;
        var myStream = '';
        var screen = '';
        var recordedStream = [];
        var mediaRecorder = '';

        //Получаем пользовательское видео по умолчанию
        getAndSetUserStream();


        socket.on( 'connect', () => {
            //вписываем id сокета
            socketId = socket.io.engine.id;
            document.getElementById('randomNumber').innerText = randomNumber;


            socket.emit( 'subscribe', {
                room: room,
                socketId: socketId
            } );


            socket.on( 'new user', ( data ) => {
                socket.emit( 'newUserStart', { to: data.socketId, sender: socketId } );
                pc.push( data.socketId );
                init( true, data.socketId );
            } );


            socket.on( 'newUserStart', ( data ) => {
                pc.push( data.sender );
                init( false, data.sender );
            } );


            socket.on( 'ice candidates', async ( data ) => {
                data.candidate ? await pc[data.sender].addIceCandidate( new RTCIceCandidate( data.candidate ) ) : '';
            } );


            socket.on( 'sdp', async ( data ) => {
                if ( data.description.type === 'offer' ) {
                    data.description ? await pc[data.sender].setRemoteDescription( new RTCSessionDescription( data.description ) ) : '';

                    h.getUserFullMedia().then( async ( stream ) => {
                        if ( !document.getElementById( 'local' ).srcObject ) {
                            h.setLocalStream( stream );
                        }

                        //save my stream
                        myStream = stream;

                        stream.getTracks().forEach( ( track ) => {
                            pc[data.sender].addTrack( track, stream );
                        } );

                        let answer = await pc[data.sender].createAnswer();

                        await pc[data.sender].setLocalDescription( answer );

                        socket.emit( 'sdp', { description: pc[data.sender].localDescription, to: data.sender, sender: socketId } );
                    } ).catch( ( e ) => {
                        console.error( e );
                    } );
                }

                else if ( data.description.type === 'answer' ) {
                    await pc[data.sender].setRemoteDescription( new RTCSessionDescription( data.description ) );
                }
            } );


            socket.on( 'chat', ( data ) => {
                h.addChat( data, 'remote' );
            } );
        } );

        //Функция - получает и устанавливает пользовательский поток
        function getAndSetUserStream() {
            h.getUserFullMedia().then( ( stream ) => { // если можем получить доступы к видео и аудио
                //сохранения переменной для дальнейшего использования
                myStream = stream;
            
                h.setLocalStream( stream ); // задаем поток
            } ).catch( ( e ) => {
                console.error( `stream error: ${ e }` ); // иначе говорим об ошибке
            } );
        }

        // функция отправки сообщения msg в комнату
        function sendMsg( msg ) {
            let data = {
                room: room,
                msg: msg,
                sender: `${username} (${randomNumber})`
            };

            //отправить сообщение data в чат
            socket.emit( 'chat', data );

            //добавить чат
            h.addChat( data, 'local' );
        }


        // инициализация 
        function init( createOffer, partnerName ) {
            pc[partnerName] = new RTCPeerConnection( h.getIceServer() );
       //     RTCRtpTransceiver.setCodecPreferences(codecs='video/vp9') 
            if ( screen && screen.getTracks().length ) {
                screen.getTracks().forEach( ( track ) => {
                    pc[partnerName].addTrack( track, screen );//должно вызвать событие согласования
                } );
            }

            else if ( myStream ) {
                myStream.getTracks().forEach( ( track ) => {
                    pc[partnerName].addTrack( track, myStream );//должно сработать переговорное событие
                } );
            }

            else {
                h.getUserFullMedia().then( ( stream ) => {
                    //сохраним наш стрим
                    myStream = stream;

                    stream.getTracks().forEach( ( track ) => {
                        pc[partnerName].addTrack( track, stream );//должно вызвать событие согласования
                    } );

                    h.setLocalStream( stream );
                } ).catch( ( e ) => {
                    console.error( `stream error: ${ e }` ); // иначе ошибка
                } );
            }



            //создать предложение
            if ( createOffer ) {
                pc[partnerName].onnegotiationneeded = async () => {
                    let offer = await pc[partnerName].createOffer();

                    await pc[partnerName].setLocalDescription( offer );

                    socket.emit( 'sdp', { description: pc[partnerName].localDescription, to: partnerName, sender: socketId } );
                };
            }



            //отправить второго кандидата в список партнеров
            pc[partnerName].onicecandidate = ( { candidate } ) => {
                socket.emit( 'ice candidates', { candidate: candidate, to: partnerName, sender: socketId } );
            };



            //добавление
            pc[partnerName].ontrack = ( e ) => {
                let str = e.streams[0];
                if ( document.getElementById( `${ partnerName }-video` ) ) {
                    document.getElementById( `${ partnerName }-video` ).srcObject = str;
                }

                else {
                    //создаем на странице элемент с видео
                    let newVid = document.createElement( 'video' );
                    newVid.id = `${ partnerName }-video`;
                    newVid.srcObject = str;
                    newVid.autoplay = true;
                    newVid.className = 'remote-video';

                    //создаем на странице элементы управления видео
                    let controlDiv = document.createElement( 'div' );
                    controlDiv.className = 'remote-video-controls';
                    controlDiv.innerHTML = `<i class="fa fa-microphone text-white pr-3 mute-remote-mic" title="Mute"></i>
                        <i class="fa fa-expand text-white expand-remote-video" title="Expand"></i>`;

                    //добавляем карту?
                    let cardDiv = document.createElement( 'div' );
                    cardDiv.className = 'card card-sm';
                    cardDiv.id = partnerName;
                    cardDiv.appendChild( newVid );
                    cardDiv.appendChild( controlDiv );

                    //помещаем div в элемент основного раздела
                    document.getElementById( 'videos' ).appendChild( cardDiv );

                    h.adjustVideoElemSize(); // настраиваем размер элемента с видео
                }
            };


            // при изменении состояния подключения
            pc[partnerName].onconnectionstatechange = ( d ) => {
                switch ( pc[partnerName].iceConnectionState ) { // если состояние подключения:
                    case 'disconnected': // отключилось - ничегоне не делаем
                    case 'failed': // провалено
                        h.closeVideo( partnerName ); // закрываем видео у партнера
                        break;

                    case 'closed': // закрыто 
                        h.closeVideo( partnerName ); // закрываем видео у партнера
                        break;
                }
            };


            // при изменении состояния сигнала
            pc[partnerName].onsignalingstatechange = ( d ) => {
                switch ( pc[partnerName].signalingState ) {
                    case 'closed': // если состояние "закрыт" - закрываем видео
                        console.log( "Signalling state is 'closed'" );
                        h.closeVideo( partnerName );
                        break;
                }
            };
        }


        // функция поделить экраном
        function shareScreen() {
            h.shareScreen().then( ( stream ) => {
                h.toggleShareIcons( true );

                //отключите переключатель видео во время совместного использования экрана. Это сделано для того, чтобы нажатие на btn не мешало совместному использованию экрана
                //он будет включен, если пользователь перестанет показывать экран
                h.toggleVideoBtnDisabled( true );

                //сохраняем трансляцию экрана
                screen = stream;

                //поделитесь новым потоком со всеми
                broadcastNewTracks( stream, 'video', false );

                //когда нажата кнопка остановки совместного доступа, отображаемая в браузере
                screen.getVideoTracks()[0].addEventListener( 'ended', () => {
                    stopSharingScreen(); // останавливаем трансляцию нашего экрана
                } );
            } ).catch( ( e ) => {
                console.error( e ); // иначе говорим об ошибке
            } );
        }


        // функция оcтановки трансляции экрана
        function stopSharingScreen() {
            //включить переключатель видео btn
            h.toggleVideoBtnDisabled( false );

            return new Promise( ( res, rej ) => {
                screen.getTracks().length ? screen.getTracks().forEach( track => track.stop() ) : '';

                res();
            } ).then( () => {
                h.toggleShareIcons( false ); // не переключить значки общего доступа
                broadcastNewTracks( myStream, 'video' ); // новая трансляция
            } ).catch( ( e ) => {
                console.error( e );
            } );
        }


        // новая трансляция
        function broadcastNewTracks( stream, type, mirrorMode = true ) {
            h.setLocalStream( stream, mirrorMode );

            let track = type == 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0]; // если тип трансляции аудио, то транслируем аудио, иначе видео

            for ( let p in pc ) {
                let pName = pc[p];

                if ( typeof pc[pName] == 'object' ) {
                    h.replaceTrack( track, pc[pName] );
                }
            }
        }

        // переключить значки записи
        function toggleRecordingIcons( isRecording ) {
            let e = document.getElementById( 'record' ); // находим элемент на странице

            if ( isRecording ) { // если сейчас идет запись
                e.setAttribute( 'title', 'Stop recording' ); // выводим текст остановка записи
                e.children[0].classList.add( 'text-danger' );
                e.children[0].classList.remove( 'text-white' );
            }

            else { // иначе, если запись не идет
                e.setAttribute( 'title', 'Record' ); // отображаем текст "запись"
                e.children[0].classList.add( 'text-white' );
                e.children[0].classList.remove( 'text-danger' );
            }
        }

        // функция начала записи видео
        function startRecording( stream ) {
            mediaRecorder = new MediaRecorder( stream, {
                mimeType: 'video/webm;codecs=vp8'// Кодеки для записи видео.  audio/ogg; codecs=vorbis; video/webm; codecs="vp8, vorbis" ; video/mp4; codecs="avc1.4d002a" -
            } );

            mediaRecorder.start( 1000 ); // запускаем запись
            toggleRecordingIcons( true ); // и меняем значки(чтобы были как во время записи)

            mediaRecorder.ondataavailable = function ( e ) {
                recordedStream.push( e.data ); // передаем данные
            };

            mediaRecorder.onstop = function () { // при остановке
                toggleRecordingIcons( false ); // вовзращаем значки

                h.saveRecordedStream( recordedStream, username ); // сохраняем запись и пользователя

                setTimeout( () => { // и делаем таймаут 3 секунды
                    recordedStream = [];
                }, 3000 );
            };

            mediaRecorder.onerror = function ( e ) {
                console.error( e );
            };
        }


        //Текстовое поле чата
        document.getElementById( 'chat-input' ).addEventListener( 'keypress', ( e ) => {
            if ( e.which === 13 && ( e.target.value.trim() ) ) { // если нажали Enter 
                e.preventDefault();

                sendMsg( e.target.value ); // отправляем сообщение

                setTimeout( () => {
                    e.target.value = '';
                }, 50 ); // и маленький таймаут 50 миллисекунд
            }
        } );


        //Когда нажимают на значок видео
        document.getElementById( 'toggle-video' ).addEventListener( 'click', ( e ) => {
            e.preventDefault();

            let elem = document.getElementById( 'toggle-video' );

            if ( myStream.getVideoTracks()[0].enabled ) {
                e.target.classList.remove( 'fa-video' );
                e.target.classList.add( 'fa-video-slash' );
                elem.setAttribute( 'title', 'Show Video' ); // задаем надпись "Показать видео"

                myStream.getVideoTracks()[0].enabled = false;
            }

            else {
                e.target.classList.remove( 'fa-video-slash' );
                e.target.classList.add( 'fa-video' );
                elem.setAttribute( 'title', 'Hide Video' ); // иначе надпись "Скрыть видео"

                myStream.getVideoTracks()[0].enabled = true;
            }

            broadcastNewTracks( myStream, 'video' ); // и транслируем видео
        } );


        //Когда щелкают значок отключения звука
        document.getElementById( 'toggle-mute' ).addEventListener( 'click', ( e ) => {
            e.preventDefault();

            let elem = document.getElementById( 'toggle-mute' );

            if ( myStream.getAudioTracks()[0].enabled ) { // если звук был включен
                e.target.classList.remove( 'fa-microphone-alt' );
                e.target.classList.add( 'fa-microphone-alt-slash' );
                elem.setAttribute( 'title', 'Unmute' ); // меняем надпись с Mute на Unmute

                myStream.getAudioTracks()[0].enabled = false; // отключаем звук
            }

            else { // иначе включаем звук и делаем надпись Mute, т.е. выключить звук
                e.target.classList.remove( 'fa-microphone-alt-slash' );
                e.target.classList.add( 'fa-microphone-alt' );
                elem.setAttribute( 'title', 'Mute' );

                myStream.getAudioTracks()[0].enabled = true;
            }

            broadcastNewTracks( myStream, 'audio' ); // и транслируем аудио
        } );


        //Когда пользователь нажимает кнопку "Поделиться экраном"
        document.getElementById( 'share-screen' ).addEventListener( 'click', ( e ) => {
            e.preventDefault();

            if ( screen && screen.getVideoTracks().length && screen.getVideoTracks()[0].readyState != 'ended' ) {
                stopSharingScreen(); // когда состояние готовности 'ended', останавливаем трансляцию
            }

            else {
                shareScreen(); // иначе делимся экраном
            }
        } );


        //При нажатии кнопки записи
        document.getElementById( 'record' ).addEventListener( 'click', ( e ) => {
            /**
             * Спрашивем пользователя, что он хочет записать
             * Получаем поток на основе выбора и начинаем запись
             */
            if ( !mediaRecorder || mediaRecorder.state == 'inactive' ) { // если нет записи 
                h.toggleModal( 'recording-options-modal', true );
            }

            else if ( mediaRecorder.state == 'paused' ) { // если запись на паузе
                mediaRecorder.resume(); // продолжить запись

            }

            else if ( mediaRecorder.state == 'recording' ) { // еси запись идет
                mediaRecorder.stop(); // остановить запись
  
            }
        } );


        //Когда пользователь выбирает запись экрана
        document.getElementById( 'record-screen' ).addEventListener( 'click', () => {
            h.toggleModal( 'recording-options-modal', false );

            if ( screen && screen.getVideoTracks().length ) {
                startRecording( screen ); // начинаем записывать
            }

            else {
                h.shareScreen().then( ( screenStream ) => {
                    startRecording( screenStream );
                } ).catch( () => { } );
            }
        } );


        //Когда пользователь выбирает запись собственного видео
        document.getElementById( 'record-video' ).addEventListener( 'click', () => {
            h.toggleModal( 'recording-options-modal', false );

            if ( myStream && myStream.getTracks().length ) {
                startRecording( myStream ); // начинаем запись
            }

            else {
                h.getUserFullMedia().then( ( videoStream ) => {
                    startRecording( videoStream );
                } ).catch( () => { } );
            }
        } );
    }
} );
