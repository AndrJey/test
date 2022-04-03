(function() {
    // Ширина и высота сделанной фотографии. Мы установим
    // ширина до значения, определенного здесь, но высота будет
    // рассчитывается на основе соотношения сторон входящего потока.
  
    var width = 320;    // Мы масштабируем ширину фото до этого
    var height = 0;     // Это будет вычислено на основе входного потока
  
    // | streaming | указывает, транслируем ли мы в данный момент
    // видео с камеры. Очевидно, мы начинаем с ложного.
  
    var streaming = false;
  
    // Различные элементы HTML, которые нам нужно настроить или контролировать. Эти
    // будет установлено функцией startup ().
  
    var video = null;
    var canvas = null;
    var photo = null;
    var startbutton = null;
  
    function startup() {
      video = document.getElementById('video');
      canvas = document.getElementById('canvas');
      photo = document.getElementById('photo');
      startbutton = document.getElementById('startbutton');
  
      navigator.mediaDevices.getUserMedia({video: true, audio: false})
      .then(function(stream) {
        video.srcObject = stream;
        video.play();
      })
      .catch(function(err) {
        console.log("An error occurred: " + err);
      });
  
      video.addEventListener('canplay', function(ev){
        if (!streaming) {
          height = video.videoHeight / (video.videoWidth/width);
        
          // В Firefox в настоящее время есть ошибка, из-за которой невозможно прочитать высоту
          // видео, поэтому будем делать предположения, если это произойдет.
        
          if (isNaN(height)) {
            height = width / (4/3);
          }
        
          video.setAttribute('width', width);
          video.setAttribute('height', height);
          canvas.setAttribute('width', width);
          canvas.setAttribute('height', height);
          streaming = true;
        }
      }, false);
  
      startbutton.addEventListener('click', function(ev){
        takepicture();
        ev.preventDefault();
      }, false);
      
      clearphoto();
    }
  
    // Заливаем фото с указанием, что ни один не был
    // захвачено.
  
    function clearphoto() {
      var context = canvas.getContext('2d');
      context.fillStyle = "#AAA";
      context.fillRect(0, 0, canvas.width, canvas.height);
  
      var data = canvas.toDataURL('image/png');
      photo.setAttribute('src', data);
    }
    
    // Захват фотографии путем получения текущего содержимого видео
    // и отрисовываем его на холсте, а затем конвертируем в PNG
    // форматируем URL данных. Рисуя его на закадровом холсте, а затем
    // рисуя это на экране, мы можем изменить его размер и / или применить
    // другие изменения перед отрисовкой.
  
    function takepicture() {
      var context = canvas.getContext('2d');
      if (width && height) {
        canvas.width = width;
        canvas.height = height;
        context.drawImage(video, 0, 0, width, height);
      
        var data = canvas.toDataURL('image/png');
        photo.setAttribute('src', data);
      } else {
        clearphoto();
      }
    }
  
    // Настраиваем наш слушатель событий для запуска процесса запуска
    // после завершения загрузки.
    window.addEventListener('load', startup, false);
  })();