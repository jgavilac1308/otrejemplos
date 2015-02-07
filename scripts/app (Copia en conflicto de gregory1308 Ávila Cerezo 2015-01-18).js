var AppManager = function () {

  var AppManager = {
    // Referencia de $routeProvider
    routeProvider: {},

    // Rutas que ha ingresado el usuario sin procesar. Toma la variable routeBase en configModule
    routeBase: {},

    // Constantes para el manejo de grupos
    GROUPS: {
      BEARS: 1,
      TIGERS: 2,
      LIONS: 3
    },

    // Para producción en repositorios de sharepoint. IMPORTANTE!!!!
    MENUS: [
      "../../Primero/primero.html",
      "../../Segundo/segundo.html",
      "../../Tercero/tercero.html",
      "../../Cuarto/cuarto.html",
    ],

    /**
     * Devuelve un array con las rutas de routeBase
     * Usado principalmente para obtener la posición actual dentro de las rutas
     *
     * @return Array array con las rutas
     */
    getPathArray: function () {
      var arr = [];

      angular.forEach(this.routeBase.routes, function (route) {
        arr.push(route.name);
      });

      return arr;
    },

    /**
     * Configura el ruteador de la aplicación de modo que puede ser utilizado
     * posteriormente. La idea es generar un ruteador secuencial fácil de utilizar
     *
     * @param app      Object    Módulo de angular al cuál se le quieren ingresar las rutas
     * @param routeBase    Object    Objeto que posee 2 elementos:
     *    routes:
     *      name: nombre de la ruta. Ejemplo: '/ruta-1'
     *      templateUrl: plantilla de angular
     *      controller: controlador especificado
     *
     *    No obstante, se pueden pasar más elementos y usarlo como se desee
     */
    configModule: function (app, routeBase) {

      var self = this,
        actualRoute = {},
        nextRoute = {},
        lastRoute = app.name + "lr"; // Nombre de la variable en localStorage para cada una de las lecciones

      // Se almacena la información de las rutas sin procesar
      self.routeBase = routeBase;

      // Inicialmente, se referencia $routeProvider
      //
      // --------------------------------------------------------------------------
      app.config(function ($routeProvider) {
        self.routeProvider = $routeProvider;
      });

      /**
       * esta función de angular es especial
       * y nos permite definir gran cantidad de configuraciones de la aplicación.
       */
      app.run(function ($rootScope, $location, $route, $window) {

        // Recuperar sesión
        // --------------------------------------------------------------------------
        if (localStorage.getItem(lastRoute)) {
          routeBase.routes.unshift({
            name: '/recuperar',
            templateUrl: '../views/common/last_route.html',
            controller: function ($scope, $location) {
              $scope.$root.isNextEnabled = true;

              /**
               * Nos dirige a la última ruta usada por el usuario.
               */
              $scope.goToLastVisited = function () {
                $location.path($scope.$root.routes[localStorage.getItem(lastRoute)].name);
              };

            },
            title: 'Recuperar sesión'
          });
        }


        // Ruta de competencias
        // --------------------------------------------------------------------------
        if (routeBase.hasOwnProperty('competences1') || routeBase.hasOwnProperty('competences2')) {
          routeBase.routes.unshift({
            name: '/competencias',
            templateUrl: '../views/common/competences.html',
            controller: function ($scope) {
              $scope.competencesSound = routeBase.competencesSound;
              $scope.competences1 = routeBase.competences1;
              $scope.competences2 = routeBase.competences2;
              $scope.competences3 = routeBase.competences3;
              $scope.$root.isNextEnabled = true;
            },
            title: 'Estándares básicos de competencias'
          });
        }


        // Constructor del ruteador en base a las rutas definidas por el desarrollador
        // --------------------------------------------------------------------------
        angular.forEach(routeBase.routes, function (route) {
          // Si el objeto simplemente tiene la propiedad grupos, entonces se inserta la vista de grupos
          if (route.hasOwnProperty('groups')) {

            // Se debe actualizar la ruta como con la información misma
            route.name = '/seleccion-grupos';
            route.title = 'Selecciona tu grupo';

            // Se añade la ruta al proveedor
            self.routeProvider.when(route.name, {
              templateUrl: '../views/common/groups.html',
              controller: function ($scope) {
                // Función que define el grupo elegido por el niño, guardándolo en localStorage
                $scope.setGroup = function (groupId) {
                  localStorage.setItem('group', groupId);
                  $rootScope.isNextEnabled = true;
                  $rootScope.goNext(); // Ir a la siguiente ruta
                }
              }
            });

          } else {
            // Añadimos normalmente la ruta definida por el desarrollador
            self.routeProvider.when(route.name, { templateUrl: route.templateUrl, controller: route.controller });
          }
        });


        // Ruta de evidencias
        // --------------------------------------------------------------------------
        if (routeBase.hasOwnProperty('evidences') === true) {
          self.routeProvider.when('/evidences', {
            templateUrl: '../views/common/evidences.html',
            controller: function ($scope) {
              $scope.description = routeBase.evidences;
              $scope.evidencesSound = routeBase.evidencesSound;
              $scope.$root.isNextEnabled = true;
            }
          });

          routeBase.routes.push({ name: '/evidences', title: 'Actividad de evidencias académicas' });
        }


        // Ruta de despedida
        // --------------------------------------------------------------------------
        self.routeProvider.when('/despedida', {
          templateUrl: '../views/common/farewell.html',
          controller: function () { }
        });

        routeBase.routes.push({ name: '/despedida' });

        // Ruta por defecto
        // --------------------------------------------------------------------------
        // Cuando se ponga una ruta diferente a las definidas inicialmente, ir a la primera.
        self.routeProvider.otherwise({ redirectTo: routeBase.routes[0].name  });
        $route.reload(); // Recargamos el ruteador, para que así lea las rutas definidas


        // ======================================================================================
        // Router - Funcionalidad global - Toda funcionalidad añadida debe ir AQUÍ
        // ======================================================================================
        $rootScope.routes = AppManager.routeBase.routes; // Referencia a las rutas de AppManager para usarlas dentro de angular
        $rootScope.GROUPS = AppManager.GROUPS; // Referencia a los grupos definidos dentro de la aplicación
        $rootScope.farewell = routeBase.farewell; // Mensaje de despedida
        $rootScope.isFarewell = false; // Switch para definir si la próxima ruta debe ser despedida
        $rootScope.resources = routeBase.resources; // Carpeta de recursos de la lección
        $rootScope.lessonTitle = ''; // Título de cada lección que se ve arriba
        $rootScope.lessonsMenu = document.referrer; // vínculo anterior. Usado para ir al menú de lecciones
        $rootScope.subjectMenu = self.MENUS[ app.name[3] - 1 ]; // Vínculo para volver al menú principal


        // $routeChangeStart
        // --------------------------------------------------------------------------
        // Esta función corre cada vez que cambia la ruta.
        $rootScope.$on("$routeChangeStart", function (event, next, current) {
          $rootScope.pathIndex = self.getPathArray().indexOf($location.path()); // Busca el índice de la ruta dentro de las rutas

          // Guardamos el índice de la actividad más avanzada hasta el momento.
          if(localStorage.getItem(lastRoute)) {
            if($rootScope.pathIndex > localStorage.getItem(lastRoute))
              localStorage.setItem(lastRoute, $rootScope.pathIndex);
          } else {
            localStorage.setItem(lastRoute, $rootScope.pathIndex);
          }

          // Por defecto, esta propiedad esta en falso y permite activar/desactivar el botón de la siguiente ruta
          $rootScope.isNextEnabled = false;

          // Actualizamos la ruta actual
          actualRoute = $rootScope.routes[$rootScope.pathIndex];

          // Analizamos la siguiente ruta, con el fin de analizar si el grupo es permitido
          nextRoute = $rootScope.routes[$rootScope.pathIndex + 1] ? $rootScope.routes[$rootScope.pathIndex + 1] : false;

          // Actualizamos el título de la lección en base a la ruta
          $rootScope.lessonTitle = actualRoute.hasOwnProperty('title') !== "undefined" ? actualRoute.title : "";

          // Reiniciamos el valor de farewell
          $rootScope.isFarewell = false;

          // Grupos de estudiantes
          // --------------------------------------------------------------------------
          // Identifica si la siguiente ruta no es permitida para el estudiante, definiendo la despedida.
          // IMPORTANTE: Esta funcionalidad solo se usó en el grado 1 de primaria incluyente.
          if (typeof nextRoute.excludedGroups !== "undefined") {
            var actualGroup = localStorage.getItem('group');

            if (nextRoute.excludedGroups.bears) { if (actualGroup == $rootScope.GROUPS.BEARS) $rootScope.isFarewell = true; }
            if (nextRoute.excludedGroups.tigers) { if (actualGroup == $rootScope.GROUPS.TIGERS) $rootScope.isFarewell = true; }
            if (nextRoute.excludedGroups.lions) { if (actualGroup == $rootScope.GROUPS.LIONS) $rootScope.isFarewell = true; }
          }
        });


        /**
         * Nos dirige a la ruta anterior.
         */
        $rootScope.goPrev = function () {
          // Función que se ejecuta antes de ir a la ultima actividad
            if (typeof $rootScope.beforeGoLast !== "undefined") {
              if ($rootScope.beforeGoLast()) {
                return false;
              }
            }

          // Solo si el índice es 0, de modo que no nos salgamos del array
          if ($rootScope.pathIndex !== 0 ) {
            if ($rootScope.pathIndex === $rootScope.routes.length - 2) {
              $window.history.back();
            } else {
              $location.path($rootScope.routes[$rootScope.pathIndex - 1].name);
            }
          }
        };


        /**
         * Nos dirige a la ruta siguiente.
         */
        $rootScope.goNext = function () {
          // Si la ruta actual es diferente al último elemento y isNextEnabled es verdadero
          if ($rootScope.pathIndex !== $rootScope.routes.length - 1 && $rootScope.isNextEnabled) {

            // Función que se ejecuta antes de ir a la siguiente actividad
            if (typeof $rootScope.beforeGoNext !== "undefined") {
              if ($rootScope.beforeGoNext()) {
                $rootScope.beforeGoNext = undefined; // Limpiamos la función
                return false;
              }
            }

            // Si $rootScope.isFarewell es verdadero, entonces redirigimos a la despedida (última ruta)
            if ($rootScope.isFarewell) {
              $location.path($rootScope.routes[$rootScope.routes.length - 2].name);
            } else {
              // Sino, rutear normalmente (sencuencia)
              $location.path($rootScope.routes[$rootScope.pathIndex + 1].name);
            }
          }
        };


        /**
         * Nos dirige a la última ruta usada por el usuario.
         */
        $rootScope.goToLastVisited = function () {
           
          $location.path($rootScope.routes[localStorage.getItem(lastRoute)].name);
        };


      });
    }
  };

  return AppManager;

};





var factories = angular.module('factories', []);

factories.factory('shuffleArrayFactory', function () {
	this.run = function(array) {
		for (var i = array.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var temp = array[i];
			array[i] = array[j];
			array[j] = temp;
		}
		return array;
	};

	return this;
});

var activities = angular.module('activities', [
  // Módulos de angular
  'ngRoute',
  'ui.sortable',

  // Otros
  'directives',
  'factories',

  // Conceptos
  'lizLetter1',
  'lizCompetences',
  'lizText1',
  'lizClickImages',
  'lizImagesAndText',
  'lizMultiplesImagesAndText',
  'lizTwoFramesDescription',
  'lizBoxAnimationFigure',
  'lizImagesInfo',
  'lizClickTransition',
  'lizShowParts',
  'lizWatch',
  'lizTable',
  'lizInputsAndTable',
  'lizShowConcepts',
  'lizHoverShowText',
  'lizShowName',
  'lizShowConceptsText',
  'lizChangeStyleSelect',
  'lizChangeStyleClick',
  'lizShowConceptsCharacter',
  'lizShowConceptsCharacters',
  'lizShowConceptsGroupExamples',
  'lizShowDescriptionImagesSound', // Maria Giraldo
  'lizShowTextCharacter',
  'lizSlideShowCharacter',
  'lizClickImageMap',
  'lizZoom',
  'lizImageMapDescription',
  'lizImageMapMat',
  'lizShowdescription',
  'lizConceptsTable',
  'lizShowImagesBlockDescription',
  'lizImagesBlockDescription',
  'lizImagesBlockMat',
  'lizShowMultipleHoverPhrase',
  'lizCorrectWordInSentence',

  // Actividades
  'lizAnimationBase',
  'lizChooseItems',
  'lizPairs',
  'lizCompleteInputs',
  'lizSelectOptionsImg',
  'lizDropCondition',
  'lizCompleteInputsDescription',
  'lizOneGroup',
  'lizOneGroupToogle', //Maria Giraldo
  'lizOneGroupRule',
  'lizTwoGroup',
  'lizRadioQuestions',
  'lizRadioQuestionsImages',
  'lizSideNumbers',
  'lizOneGroupShape',
  'lizGreaterLowerMat',
  'lizAbacus',
  'lizGiraffe',
  'lizDifferences',
  'lizLetterSoup',
  'lizCrossword',
  'lizCrosswordWithLetter', //Maria Giraldo
  /*'lizCrosswordWithPuzzle', */
  'lizSoundGroup',
  'lizSoundGroups',
  'lizTransclusion',
  'lizTransclusions',
  'lizPairsInputs',
  'lizClickAndListen',
  'lizBuyItems',
  'lizDropOut',
  'lizSelectWords',
  'lizImageMapSelect',
  'lizTangram',
  'lizTablePath',
  'lizReplaceWithInputs',
  'lizReplaceWithInputsMat',
  'lizTablePathInstruction',
  'lizCountElements',
  'lizDropBoxes',
  'lizDragMarkCanvas',
  'lizCountElements',
  'lizCountElements2',
  'lizCompareSample',
  'lizGreaterLowerThan',
  'lizCompleteLetters',
  'lizChalkboard',
  'lizDragToText',
  'lizDragToTexts', 
  'lizDragToImg',
  'lizDragToMat',
  'lizImageGroupDrop',
  'lizCompleteWords',
  'lizGroupCompleteWords',
  'lizGroupCompleteLetters',
  'lizGroupCompleteImages',
  'lizGroupClassifyTable',
  'lizGroupSelectWords',
  'lizClickToSelectPosition',
  'lizClickToCompleteInput',
  'lizCompleteInputsPosition',
  'lizGroupCompleteSound',
  'lizGroupCompleteText',
  'lizGroupTableTextFree',
  'lizGroupTableTextConditions',
  'lizGroupTableTextConditionsOptions',
  'lizGroupTableTextOptions',
  'lizGroupCompleteTextFree',
  'lizGroupCompleteFreeConditions',
  'lizGroupCompleteYesNot',
  'lizGroupCompleteSounds',// No utilizar solo realizando una prueba gregory
  'lizCompleteWordsWi',
  'lizCompleteInputsFree',
  'lizComplementary',
  'lizNumericSequences',
  'lizDragDropMultiples',
  'lizDragDropMultiplesPositions',
  'lizOperationInput',
  'lizDropImageSample',
  'lizThousandNumbers',
  'lizTenThousandNumbers',
  'lizThousandPatterns',
  'lizStackMultiple',
  'lizSequences',
  'lizGroupInputs',
  'lizButtonBubbleDescription',
  'lizPuzzleWord',
  'lizCompareSounds',
  'lizMultipleSelection',
  'lizDragDropMark',
  'lizMultipleMark',
  'lizMultipleImageMapDescription',
  'lizPuzzle1',
  'lizPuzzle2',
  'lizPuzzle3',
  'lizPuzzle4',
  'lizPuzzle5',
  'lizPairsSquares',
  'lizShowConceptsImages',
  'lizShowConceptsImg',
  'lizCompleteTableInputs',
  'lizCompleteTableImageInputs',
  'lizCompleteInputsTrueFalse',
  'lizCompleteTableWithList',
  'lizBubbleDescription',
  'lizCompleteTableWithText',
  'lizChooseCorrectOption',
  'lizClickAndListen',
  'lizImageSound',
  'lizWriteTrueFalse',
  'lizCompleteInputParts',
  'lizCompleteTextBoxes',
  'lizCompleteWordsSelect',
  'lizSelectCheckbox',
  'lizDragDropMultiplesDiff',
  'lizComplementary2',
  "lizTextActivity",
  'lizPairsWithMessage',
  'lizSelectQuestions',
  'lizSelectOptionsPositions',
  'lizChooseCorrectImage',
  'lizSelectTableImageMultiple',
  'lizSelectCorrectImageOption',
  'lizSelectAllCorrectImageOption',
  'lizShowHoverWords',
  'lizJoiningLines',
  'lizGroupSelectMultiplesWords',
  'lizCompleteMultitable',
  'lizSelectOptionsTable',
  'lizCompleteTableRandomInputs',
  'lizCheckboxOptions',
  'lizGroupTableCompleteWords',
  'lizGroupChoiceWords',
  'lizDragDropPairText',
  'lizGroupPuzzleWord',
  'lizQuestionsImages', //Maria Giraldo
  'lizChooseCorrectImageSecuence', //Maria Giraldo

  // Animations
  'lizAnimationVideo'


]);

var lizAbacus = angular.module('lizAbacus', ['factories']);

lizAbacus.directive('abacus', function  (shuffleArrayFactory) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			baseDescription: '@',
			baseAudio: '@',
			inputDescription: '@',
			inputAudio: '@',
			formDescription: '@',
			formAudio: '@'
		},
		templateUrl: '../views/activities/abacus.html',
		link: function (scope, element, attrs) {
			var opt = scope.options, // alias de options
				columnTemp = {}, // Variable temporal para las columnas
				wrongAnswers = 0, // Número de respuestas incorrectas. Necesarias para activar failure
				minRightAnswers = opt.minRightAnswers;

			// Modos
			scope.FORM_MODE = 1,
			scope.INPUT_MODE = 2;
			scope.formChances = opt.chances; // Chances for FORM_MODE
			scope.inputChances = opt.chances; // Chances for INPUT_MODE

			// Calificaciones
			scope.rightAnswer = false;
			scope.wrongAnswer = false;
			scope.success = false;
			scope.failure = false;

			scope.description = scope.baseDescription; // Damos a description el valor base
			scope.mode = 0; // Modo seleccionado
			scope.userNumber = ''; // número ingresado por el usuario
			scope.abacusNumber = 0; // número a formar por el ábaco
			scope.audioMode = ''; // Audio a reproducir

			scope.$watch('mode', function (mode) {
				if(mode === 0) scope.audioMode = 'base';
				if(mode === 1) scope.audioMode = 'form';
				if(mode === 2) scope.audioMode = 'input';
			});

			scope.columns = []; // Array de columnas
			var columnNames = ['Uni', 'Dec', 'Cen', 'UMil', 'DMil'];

			// Constructor de columns
			for(var i=0; i < opt.numCols; i++){
				columnTemp = {
					name: columnNames[i], // Nombre de la columna
					ballText: Math.pow(10, i), // texto en la bola
					rings: [] // Array para los aros en cada columna
				};
				scope.columns.unshift(columnTemp); 
			}

			// ===================================================
			// Interfaz
			// ===================================================
			/**
			 * Selecciona el modo de trabajo
			 */
			scope.selectMode = function (mode) {
				scope.mode = mode;
				wrongAnswers = 0; // Reinicia las preguntas incorrectas

				// Cambia la descripción según el modo
				if(scope.mode === scope.FORM_MODE) scope.description = scope.formDescription;
				if(scope.mode === scope.INPUT_MODE) scope.description = scope.inputDescription; 

				// Corre el modo
				scope.run();
			};

			/**
			 * Función principal. Verifica la actividad según el modo
			 */
			scope.verify = function () {
				// FORM_MODE
				if(scope.mode === scope.FORM_MODE) {
					// recuperamos el número desde las columnas del ábaco
					var num = '';
					scope.columns.forEach(function (col) { num += col.rings.length; });

					if(parseInt(num) === scope.abacusNumber){
						// Respuesta Correcta
						scope.rightAnswer = scope.abacusNumber;
					} else {
						// Respuesta Incorrecta
						scope.wrongAnswer = scope.abacusNumber;
						wrongAnswers++;
					}

					scope.formChances--; // Reducimos las posibilidades
					if(scope.formChances === 0) scope.mode = 0;
				}

				// INPUT_MODE
				if(scope.mode === scope.INPUT_MODE) {
					if(parseInt(scope.userNumber) === scope.abacusNumber){
						// Respuesta Correcta
						scope.rightAnswer = scope.abacusNumber;
					} else {
						// Respuesta Incorrecta
						scope.wrongAnswer = scope.abacusNumber;
						wrongAnswers++;
					}

					scope.inputChances--; // Reducimos las posibilidades
					if(scope.inputChances === 0) scope.mode = 0;
				}

				// genera el próximo intento
				scope.run();

				// Vuelve a intentarlo
				if(wrongAnswers === opt.wrongAnswers) scope.failure = true;

				// Fin de la actividad satisfactorio
				if(scope.inputChances === 0 && scope.formChances === 0){
					scope.$root.isNextEnabled = true;
					scope.success = true;
				}
			};

			/**
			 * Inicia cada actividad según el modo
			 */
			scope.run = function () {
				scope.abacusNumber = scope.generateNumber(opt.numCols); // genera el número

				if(scope.mode === scope.FORM_MODE) {
					// reinicia los anillos
					scope.columns.forEach(function (col) { col.rings.length = 0; });
				}

				if(scope.mode === scope.INPUT_MODE) {
					scope.userNumber = ''; // Reinicia el input

					// Dividimos el número en digitos. Luego, llenamos cada array de anillos
					// con el número de elementos seleccionado
					var temp = scope.abacusNumber.toString();

					for (var i=0; i < temp.length; i++) {
						scope.columns[i].rings.length = 0; // Vacía el array de anillos
						for(var j=0; j < temp[i]; j++){
							scope.columns[i].rings.push(j);
						}
					}
				}
			};

			/**
			 * Añade un anillo a la columna
			 */
			scope.addRing = function (col) {
				if(col.rings.length < 9) col.rings.push(Math.random() * 10000);
			};

			/**
			 * Remueve un anillo de la columna
			 */
			scope.removeRing = function (col) {
				if(col.rings.length && scope.mode === scope.FORM_MODE) col.rings.pop();
			};

			// ===================================================
			// Útiles
			// ===================================================
			/**
			 * Genera números aleatorios, en base a una cantidad determinada de dígitos
			 */
			scope.generateNumber = function (digits) {
				var min = Math.pow(10, digits - 1);
				var max = (min * 9);

				return Math.floor(Math.random() * max) + min;
			};

			// ===================================================
			// Solo Estilos
			// ===================================================
			/**
			 * Devuelve los estilos de las columnas
			 */
			scope.getColStyles = function () {
				var styles = '';
				styles += "width: " + (100 / scope.columns.length) + "%;";

				return styles;
			};

			/**
			 * Devuelve los estilos de los aros o bolas que van en el abaco
			 */
			scope.getBallStyles = function (index) {
				var styles = '',
					ballHeight = element.find('.abcol-ball').outerHeight(); // altura de los aros

				styles += "bottom: " + (ballHeight * index) + "px;";

				return styles;
			};

		}
	}; 
});

var lizBuyItems = angular.module('lizBuyItems', []);

// Knockout Pairs Factory
lizBuyItems.factory('buyItemsActivity', function ($rootScope) {

	var buyItemsActivity = {};

	/**
	 * Crea el ViewModel
	 */
	buyItemsActivity.create = function (options) {
		return new buyItemsActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 */
	buyItemsActivity._ViewModel = function (opt) {
		var self = this,
			rightAnswers = 0, // Contador
			total = 0, // Suma total de los productos
			chances = opt.chances; // Posibilidades de equivocarse

		self.products = ko.observableArray(opt.products); // productos
		self.showTotal = ko.observable(false); // activa el cuadro de texto de total
		self.total = ko.observable(''); // cuadro de texto con el total
		self.money = ko.observableArray(opt.money); // productos

		// Monedas
		self.coins = ko.observableArray([
			{
				src: 'coin_50',
				alt: "moneda de 50 pesos",
				title: "Banco de la Republica [Fotografía] (2013). Obtenido de http://www.banrep.gov.co/es/monedas/2140",
				value: 50
			},
			{
				src: 'coin_100',
				alt: "moneda de 100 pesos",
				title: "Banco de la Republica [Fotografía] (2013). Obtenido de http://www.banrep.gov.co/es/node/32360",
				value: 100
			},
			{
				src: 'coin_200',
				alt: "moneda de 200 pesos",
				title: "Banco de la Republica [Fotografía] (2013). Obtenido de http://www.banrep.gov.co/es/node/32361",
				value: 200
			},
			{
				src: 'coin_500',
				alt: "moneda de 500 pesos",
				title: "Banco de la Republica [Fotografía] (2013). Obtenido de http://www.banrep.gov.co/es/node/32363",
				value: 500
			},
		]);

		// Billetes
		self.bills = ko.observableArray([
			{
				src: "bill_1000",
				alt: "billete de 1000 pesos",
				title: "Banco de la Republica [Fotografía] (2013). Obtenido de: http://www.banrep.gov.co/es/contenidos/page/billete-1000-pesos",
				value: 1000
			},
			{
				src: "bill_2000",
				alt: "billete de 2000 pesos",
				title: "Banco de la Republica [Fotografía] (2013). Obtenido de: http://www.banrep.gov.co/es/contenidos/page/billete-2000-pesos",
				value: 2000
			},
			{
				src: "bill_5000",
				alt: "billete de 5000 pesos",
				title: "Banco de la Republica [Fotografía] (2013). Obtenido de: http://www.banrep.gov.co/es/contenidos/page/billete-5000-pesos",
				value: 5000
			}
		]);

		if (opt.money){

			self.bills = self.money;
			self.coins = false
		}

		// Añadimos a cada uno de los productos un observableArray para ir guardando los productos y 
		// una propiedad computed
		ko.utils.arrayForEach(self.products(), function(product){
			total += product.price;

			product.priceSum = ko.observableArray();
			product.priceSum.max = product.price; // Precio máximo

			product.priceSum.counter = ko.computed({
				read: function() {
					var total = 0;

					this.priceSum().forEach(function(item){
						total += item.value;
					});

					return total;
				},
				owner: product
			});
		});

		self.audio = ko.observable(opt.audio); // audio
		self.resources = $rootScope.resources; // Carpeta de recursos desde angular

		self.rightAnswers = 0; // Inicializamos el número de respuestas buenas a 0

		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();
		self.failure = ko.observable(false);
		self.success = ko.observable(false);

		/**
		 * Reproduce el audio de la instrucción.
		 */
		self.playAudio = function () {
			$('#audio-instruction')[0].play();
		};

		/**
		 * Obtiene los estilos de los productos.
		 */
		self.getProductStyles = function () {
			var styles = '';
			styles += 'width: ' + (100 / self.products().length) + '%;';

			return styles;
		};


		/**
		 * Verifica los elementos cada vez que se sueltan.
		 */
		self.verifyAnswer = function (arg) {
			var parent = arg.targetParent,
				item = arg.item;

			if(parent.max < parent.counter() + item.value) {
				// Respuesta incorrecta
				arg.cancelDrop = true;
				self.wrongAnswer(Math.random());
				chances--;
			} 

			// Si es igual, suma la respuesta correcta
			if(parent.max === parent.counter() + item.value) {
				self.rightAnswer(Math.random());
				rightAnswers++;
			}

			// Muestra el cuadro de texto para el total
			if(rightAnswers === self.products().length) {
				self.showTotal(true);
			}

			if(chances === 0) {
				// termina la actividad con fracaso
				self.failure(true);
			}
		};


		/**
		 * Verifica el total del cuadro.
		 */
		self.verifyTotal = function () {
			if(parseInt(self.total()) === total) {
				$rootScope.isNextEnabled = true; // activa la siguiente actividad
				self.success(true);
			} else {
				self.failure(true);
			}
		};


	};

	/**
	 * Inicializa la instancia del ViewModel creado con buyItemsActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	buyItemsActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return buyItemsActivity;

});

lizBuyItems.directive('buyItems', function  (buyItemsActivity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			description: '@',
			instruction: '@',
			audio: '@',
			customClass: '@'
		},
		templateUrl: '../views/activities/buy_items.html',
		link: function postLink(scope, element, attrs) {
			// Añadimos el audio a options
			scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;

			// Corremos la aplicación
			var vm = buyItemsActivity.create(scope.options);
			buyItemsActivity.run(vm);
		}
	}; 
});

var lizChalkboard = angular.module('lizChalkboard', []);

lizChalkboard.directive('chalkboard', function  () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			audio: '@',
			description: '@'
		},
		templateUrl: '../views/activities/chalkboard.html',
		link: function postLink(scope, element, attrs) {

			var opt = scope.options,
				rightAnswers = 0, // Preguntas correctas
				questions = opt.questions, // Preguntas por modo
				completedRanges = 0, // Número completado de rangos
				minRightAnswers = opt.minRightAnswers, // Preguntas mínimas para pasar
				chances = opt.chances;

			// Constantes para las operaciones
			var oprs = {
				addition: {
					sign: '+'
				},
				subtraction: {
					sign: '-'
				},
				multiplication: {
					sign: 'x'
				},
				division: {
					sign: '/'
				}
			};

			scope.ranges = opt.ranges; // Rangos u opciones de dificultad
			scope.selectedOpr = oprs[opt.operation]; // Operación seleccionada al inicio
			scope.selectedRange = false; // Rango a seleccionar

			// Números y total
			scope.number1 = 0;
			scope.number2 = 0;
			scope.total = 0;

			// Calificaciones 
			scope.rightAnswer = false;
			scope.wrongAnswer = false;
			scope.success = false;
			scope.failure = false;

			// Input
			scope._total = '';

			// Cada vez que cambia el rango, se genera la nueva operación
			scope.$watch('selectedRange', function (val) {
				if(val){
					scope.generateOperation();
				}
			});

			/**
			 * Verifica el campo de texto con el número total
			 */
			scope.verify = function () {
				if(scope._total === '') return; 

				// Si no es un número, borramos el último caractér
				if(!scope._total.match(/^\d+$/)){
					scope._total = scope._total.slice(0, -1);
					return;
				}		

				// Si se ha llenado el input con los dígitos necesarios
				if(scope._total.length === scope.total.toString().length){
					if(parseInt(scope._total) === scope.total) {
						// Respuesta Correcta
						scope.rightAnswer = Math.random(); // Disparador de respuesta

						rightAnswers++;
						chances = opt.chances;
						scope._total = ''; // Reinicia el input
						scope.generateOperation(); // Genera la siguiente operación
						questions--; // reducimos las preguntas

					} else {
						// Respuesta Incorrecta
						scope.wrongAnswer = Math.random(); // Disparador de respuesta
						scope._total = ''; // Reinicia el input

						chances--; // Reduce las posibilidades

						// Si se acaban las oportunidades
						if(chances === 0){
							scope.generateOperation(); // Genera la siguiente operación
							chances = opt.chances;
							questions--; // reducimos las preguntas
						}
					}
				}

				// Si no hay más preguntas
				if(questions === 0){
					questions = opt.questions; // Reiniciamos las preguntas
					completedRanges++; // Aumeta el número de rangos completados

					scope.selectedRange.completed = true; // Se añade esta propiedad para deshabilitar
					scope.selectedRange = false; // Reinicia
				}

				// Fin del juego
				if(scope.ranges.length === completedRanges){
					if(rightAnswers >= minRightAnswers){
						scope.$root.isNextEnabled = true;
						scope.success = true;
					} else {
						scope.failure = true;
					}
				}
				
			};

			/**
			 * Genera el siguiente número
			 */
			scope.generateOperation = function () {

				var min = scope.selectedRange.range[0];
				var max = scope.selectedRange.range[1];


				// Suma
				if(opt.operation === "addition"){
					scope.number1 = Math.floor( Math.random() * (max - min) + min	);
					scope.number2 = Math.floor( Math.random() * (max - min) + min	);

					scope.total = scope.number1 + scope.number2;
				}

				// Resta
				if(opt.operation === "subtraction"){
					// Nos aseguramos que el primero número siempre sea mayor al segundo
					do{
						scope.number1 = Math.floor( Math.random() * (max - min) + min	);
						scope.number2 = Math.floor( Math.random() * (max - min) + min	);
					} while(scope.number1 < scope.number2);

					scope.total = scope.number1 - scope.number2;
				}

				// Multiplicación
				if(opt.operation === "multiplication"){
					// Para la multiplicación, hay que usar 2 rangos distintos
					var r = scope.selectedRange.range; // Alias

					// Se toman los primeros dos elementos de range
					scope.number1 = Math.floor( Math.random() * (r[1] - r[0]) + r[0]	);

					// Se toman los últimos dos elementos de range
					scope.number2 = Math.floor( Math.random() * (r[2] - r[3]) + r[3]	);

					scope.total = scope.number1 * scope.number2;
				}

				// Division
				if(opt.operation === "division"){
					// Nos aseguramos que el segundo número no sea 0, y que se pueda dividir
					// sin decimales
					do{
						scope.number1 = Math.floor( Math.random() * (max - min) + min	);
						scope.number2 = Math.floor( Math.random() * (max - min) + min	);
					} while(scope.number1 < scope.number2 || scope.number1 % scope.number2 !== 0 || scope.number1 / scope.number2 === 1);

					scope.total = scope.number1 / scope.number2;
				}

			};

			scope.disableInput = function (range) {
				return scope.selectedRange || range.completed;
			};


		}
	}; 
});

var lizCheckboxOptions = angular.module('lizCheckboxOptions', ['factories']);

lizCheckboxOptions.directive('checkboxOptions', function  (shuffleArrayFactory) {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      audio: '@',
      description: '@'
    },
    templateUrl: '../views/activities/checkbox_options.html',
    link: function (scope, element, attrs) {
      var opt = scope.options,
        rightAnswers = 0;

      // variables básicas de la acividad de angular
      scope.rightAnswer = false;
      scope.wrongAnswer = false;
      scope.success = false;
      scope.failure = false;
      scope.hasModalImage = (opt.hasModalImage) ? true : false;
      scope.hasNoQuestions = (opt.hasNoQuestions) ? true : false;
      scope.chancesPerItem = (opt.chancesPerItem) ? opt.chancesPerItem : 2;
      scope.minRightAnwers = opt.minRightAnwers;
      scope.globalNumAnswers = 0;
      scope.randomItems = (!scope.options.randomItems) ? false:true;

      if (scope.hasModalImage) {
        scope.modalSrc = opt.modalSrc;
        scope.modalAlt = opt.modalAlt;
        scope.modalBtnText = opt.modalBtnText;
      }

      // Imagen principal
      scope.src = opt.src;
      scope.alt = opt.alt;

      // Preguntas
      scope.questions = opt.questions;
        angular.forEach(scope.questions, function (question, key) {
          question.numAnswers = opt.numAnswers;
          question.chances = scope.chancesPerItem - 1;
          scope.globalNumAnswers += opt.numAnswers;
        });

      // añadimos el número de posibilidades
      scope.questions.forEach(function (q) {
        q.chances = scope.chancesPerItem;
        if (scope.randomItems) {
          shuffleArrayFactory.run(q.answers);
        }
      });

      /**
       * Verifica la respuesta.
       */
       var counter = 0;
      scope.verify = function (item, answer) {
        if(answer.answer) {
          scope.rightAnswer = Math.random();
          answer.wrong = false;
          answer.right = true;
          rightAnswers += 1;
          counter++;
          answer.completed = true;
          item.chances--;
          if (0 === item.chances) {
            item.completed = true;
          }
        } else {
          answer.wrong = true;
          answer.selectedAnswer = false;
          scope.wrongAnswer = Math.random(); 
          item.chances -= 1;
          counter++;
          if(item.chances === 0) {item.completed = true;}
        }

        // Contamos los elementos terminados
        //var completedItems = scope.questions.filter(function (q) {
        //  return q.completed;
        //}).length;

        if(counter === scope.globalNumAnswers) {
          // solo pasa la actividad si todas las respuestas son correctas
          if(rightAnswers === scope.globalNumAnswers || rightAnswers >= scope.minRightAnwers) {
            scope.$root.isNextEnabled = true;
            scope.success = true;
          } else {
            scope.failure = true;
          }
        }
      };
    }
  };
});

/**
 * Pertime escoger entre varias imagenes una correcta haciendo click.
 */
 var lizChooseCorrectImage = angular.module('lizChooseCorrectImage', []);

 lizChooseCorrectImage.directive('chooseCorrectImage', function(){
 	// Runs during compile
 	return {
 		// name: '',
 		// priority: 1,
 		// terminal: true,
 		scope: {
 			options: "=",
 			title: "@",
      		description: '@',
      		instruction: '@',
      		audio: '@'
 		}, // {} = isolate, true = child, false/undefined = no change
 		// controller: function($$scope, $element, $attrs, $transclude) {},
 		// require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
 		restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
 		// template: '',
 		templateUrl: '../views/activities/choose_correct_image.html',
 		// replace: true,
 		// transclude: true,
 		// compile: function(tElement, tAttrs, function transclude(function($scope, cloneLinkingFn){ return function linking($scope, elm, attrs){}})),
 		link: function($scope, $sce) {

 			$scope.items = $scope.options.items;
 			// $scope.customClass = $scope.options.customClass;
 			$scope.complete = false; // Cuando termina la actividad
      		// $scope.itemsPerRow = $scope.options.itemsPerRow;
      		$scope.chances = $scope.options.chances-1;
      		$scope.counter = 0;

      		$scope.$watch('complete', function (complete) {
		        if (complete) {
		          	if ($scope.counter === 0) {
		          		// éxito
						$scope.success = true;

						// Activamos la siguiente actividad o ruta
						$scope.$root.isNextEnabled = true;
		          	} else {
		          		// fracaso
						$scope.failure = true;
		          	}
		        }
	      	});

	      	/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			$scope.getStyles = function () {
				var styles = "";

				if($scope.itemsPerRow){
					styles += "width: " + (100 / $scope.itemsPerRow) + "%;";
				} else {
					styles += "width: " + (100 / $scope.items.length) + "%;";
				}
				
				return styles;
			};


	      	$scope.verify = function (item) {
	      		console.log(item);
	      		if (true === item.correct) {
	      			$("#right-answer").fadeIn(300).delay(400).fadeOut(300);
	      			$scope.complete = true;
	      		} else {
	      			if($scope.chances === 0){
                    	$scope.complete = true;
                    } else {
                    	chances--;
                    }
                    $scope.counter++;
                    $("#wrong-answer").fadeIn(300).delay(400).fadeOut(300);
	      		}
	      	};
 		}
 	};
 });
/**
 * Pertime escoger entre varias imagenes una correcta haciendo click.
 */
 var lizChooseCorrectImageSecuence = angular.module('lizChooseCorrectImageSecuence', []);

lizChooseCorrectImageSecuence.directive('chooseCorrectImageSecuence', function(){
 	// Runs during compile
 	return {
 		// name: '',
 		// priority: 1,
 		// terminal: true,
 		scope: {
 			options: "=",
 			title: "@",
      		description: '@',
      		instruction: '@',
      		audio: '@'
 		}, // {} = isolate, true = child, false/undefined = no change
 		// controller: function($$scope, $element, $attrs, $transclude) {},
 		// require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
 		restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
 		// template: '',
 		templateUrl: '../views/activities/choose_correct_image_secuence.html',
 		// replace: true,
 		// transclude: true,
 		// compile: function(tElement, tAttrs, function transclude(function($scope, cloneLinkingFn){ return function linking($scope, elm, attrs){}})),
 		link: function($scope, $sce) {

 			$scope.items = $scope.options.items;
 			// $scope.customClass = $scope.options.customClass;
 			$scope.complete = false; // Cuando termina la actividad
      		// $scope.itemsPerRow = $scope.options.itemsPerRow;
      		$scope.chances = $scope.options.chances-1;
      		$scope.counter = 0;
            $scope.indexI = 0;

      		$scope.$watch('complete', function (complete) {
		        if (complete) {
		          	if ($scope.counter === 0) {
		          		// éxito
						$scope.success = true;

						// Activamos la siguiente actividad o ruta
						$scope.$root.isNextEnabled = true;
		          	} else {
		          		// fracaso
						$scope.failure = true;
		          	}
		        }
	      	});

	      	/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			$scope.getStyles = function () {
				var styles = "";

				/*if($scope.itemsPerRow){
					styles += "width: " + (100 / $scope.itemsPerRow) + "%;";
				} else {
					//styles += "width: " + (100 / $scope.items.length) + "%;";
				}
				*/
				return styles;
			};


	      	$scope.verify = function (item) {

                $scope.chances--;

                // Si la imagen seleccionada es la que sigue en el orden
                if (item.img === $scope.options.answers[$scope.indexI].img){
                    $scope.options.answers[$scope.indexI].imgDefault = $scope.options.answers[$scope.indexI].img;
                    $scope.options.answers[$scope.indexI].completed = true;
                    $("#right-answer").fadeIn(300).delay(400).fadeOut(300);
                    $scope.indexI++;
                }
                else{
                    $("#wrong-answer").fadeIn(300).delay(400).fadeOut(300);
                    $scope.counter++;
                }

                console.log("verirfy");


                // Si ha cumplido con todas, se termina
                var completedItems =  $scope.options.answers.filter(function (q) {
                    return q.completed;
                }).length;

                if (completedItems == $scope.options.answers.length){
                    $scope.complete = true;
                    scope.$root.isNextEnabled = true;
                }

                if($scope.chances === 0){
                    $scope.complete = true;
                }


                //$scope.options.answers[$scope.indexI].imgDefault = $scope.options.answers[$scope.indexI].img;


	      		/*if (true === item.correct) {
	      			$("#right-answer").fadeIn(300).delay(400).fadeOut(300);
	      			$scope.complete = true;
	      		} else {
	      			if($scope.chances === 0){
                    	$scope.complete = true;
                    } else {
                    	chances--;
                    }
                    $scope.counter++;
                    $("#wrong-answer").fadeIn(300).delay(400).fadeOut(300);
	      		}*/
	      	};
 		}
 	};
 });
/**
 * La actividad permite escoger una opción entre tres
 * y verificar si es correcta de acuerdo a una condición.
 */
var lizChooseCorrectOption = angular.module('lizChooseCorrectOption', []);

lizChooseCorrectOption.directive('chooseCorrectOption', function () {
    'use strict';
    return {
        restrict: 'E',
        templateUrl: '../views/activities/choose_correct_option.html',
        scope: {
            options: '=',
            instruction: '@',
            title: '@',
            description: '@',
            audio: '@'
        },
        link: function (scope, iElement, iAttrs) {
            scope.rightAnswers = 0;
            scope.complete = false; // Cuando termina la actividad
            scope.block = false;
            scope.success = false;
            scope.failure = false;

            // watch if the activity is finished
            scope.$watch('complete', function (complete) {
                if (complete) {
                    if (scope.rightAnswers >= scope.options.minRightAnswers) {
                        // éxito
                        scope.success = true;

                        // Activamos la siguiente actividad o ruta
                        scope.$root.isNextEnabled = true;
                    } else {
                        // fracaso
                        scope.failure = true;
                    }
                }
            });

            scope.makeId = function (id) {
                var newId = id.replace(" ", "_");
                var text = newId + "_";
                var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

                for (var i = 0; i < 5; i++) {
                    text += possible.charAt(Math.floor(Math.random() * possible.length));
				}

                return text;
            };

            scope.items = scope.options.data;
            
            angular.forEach(scope.options.aOptions, function (value, key) {
            	value.optId = scope.makeId(value.name);
            });

            scope.aOptions = scope.options.aOptions;

            // Si la descripción o el título están, entonces la instrucción va al fondo
            scope.isBottom = scope.title || scope.description;

            var counter = 0, chances = scope.options.chancesPerItem - 1;

            scope.verify = function (option, item, id) {
                if ((option === null) || (option === '')) { return; }

                // Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
                if (option.toLowerCase() === item.answer.toLowerCase()) {
                    scope.rightAnswers++;
                    item.wrong = false;
                    item.right = true;
                    item.block = true; // marcamos el item como completo, para desactivar el input
                    counter++;
                } else {

                    item.wrong ? chances = scope.options.chancesPerItem - 2 : chances = scope.options.chancesPerItem - 1;

                    item.wrong = true;


                    if (chances === 0) {
                        item.block = true;
                        counter++;
                        chances = scope.options.chancesPerItem - 1;
                    } else {
                        chances--;
                        $("#" + id).button('reset');
                    }
                }

                if (counter === scope.options.data.length) {

                    scope.complete = true;

                }

                scope.$apply();
            };

            
        }
    };
});
/**
 * La actividad permite seleccionar varios elementos dando click.
 */
var lizChooseItems = angular.module('lizChooseItems', []);

lizChooseItems.directive('chooseItems', function(){
	return  {
		restrict: 'E',
		templateUrl: '../views/activities/choose_items.html',
		transclude: true,
		scope: {
			options: "=",
			description: "@",
			audio: "@"
		},
		link: function(scope, element, attrs){

			// Variables de éxito - fracaso
			scope.success = false;
			scope.failure = false;

			scope.chances = scope.options.chances ? scope.options.chances : scope.options.items.lenght; // Posibilidades de realizar la actividad
			scope.rightAnswers = 0; // contador de respuestas buenas
			scope.minRightAnswers = scope.options.minRightAnswers; // número mínimo de respuestas
			scope.itemsfloat = scope.options.itemsfloat ? scope.options.itemsfloat : false;
			scope.activateAfter = scope.options.activateAfter ? scope.options.activateAfter : false;

			console.log(scope.itemsfloat);

			// Disparadores para las preguntas buenas y malas
			scope.rightAnswer = false;
			scope.wrongAnswer = false;

			scope.verify = function (item) {
				// para impedir que se repitan letras
				if(item._completed) return;

				item._completed = true;

				if (item.answer) {
					// respuesta buena
					scope.rightAnswer = item;
					scope.rightAnswers++;
				} else {
					// Respuesta incorrecta
					scope.wrongAnswer = item;
				}

				scope.chances--;

				// Fin de la actividad
				if(scope.chances === 0) {
					if (scope.rightAnswers >= scope.minRightAnswers) {
						scope.success = true;

						// Activamos la siguiente
						scope.$root.isNextEnabled = true;
					} else {
						scope.failure = true;
					}
				}

				// si activateAfter esta definido 
				if(scope.activateAfter){
					if(scope.rightAnswers === scope.activateAfter){
						// Activamos la siguiente
						scope.$root.isNextEnabled = true;
					}
				}
			};	
		}
	};
});


var lizClickAndListen = angular.module('lizClickAndListen', []);

lizClickAndListen.directive('clickAndListen', function  () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			audio: '@',
			description: '@'
		},
		templateUrl: '../views/activities/click_and_listen.html',
		link: function postLink(scope, element, attrs) {
			var opt = scope.options;

			// Elementos de la actividad
			scope.headings = opt.headings;
			scope.items = opt.items;

			// calificación
			scope.success = false;
			scope.failure = false;


			/**
			 * Añade la propiedad de completado y verifica el fin de la actividad
			 */
			scope.verify = function (item) {
				// si esta completo, entonces sale automáticamente
				if(item.completed) return;

				item.completed = true;

				var completed = scope.items.filter(function(item){ return item.completed; }).length;

				// fin de la actividad
				if(completed === scope.items.length) {
					scope.$root.isNextEnabled = true;
					scope.success = true;
				}
			};


		}
	}; 
});

var lizClickImageMap = angular.module('lizClickImageMap', []);

lizClickImageMap.directive('clickImageMap', function () {
	return {
		restrict: 'E',
		scope: {
			options: "=",
			title: '@',
			instruction: '@',
			description: '@'
		},
		templateUrl: '../views/concepts/click_image_map.html',
		link: function (scope, element, attrs) {

			var opt = scope.options,
				countCompleted = 0;

			// Recuperamos cada valor de las variables
			scope.canvas = scope.$root.resources + '/' + opt.canvas + '.png'; // imagen a mapear
			scope.canvasAlt = opt.canvasAlt; // Texto alternativo de la imagen
			scope.targets = opt.targets; // mapas donde se da click para el sonido

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;

			/**
			 * Revisa si el elemento ya fue seleccionado
			 */
			scope.markCompleted = function (target) {
				// Marcamos el elemento seleccionado con un valor booleano
				if(! target.hasOwnProperty('_isCompleted')){
					target._isCompleted = true;
				}

				// Contamos los completos
				countCompleted = scope.targets.filter(function(target){
					return target._isCompleted;
				}).length;

				// revisamos si ya se completaron todos los objetivos
				if(countCompleted === scope.targets.length){
					scope.$root.isNextEnabled = true;
				}

			};

			/**
			 * Devuelve los estilos de cada target
			 */
			scope.getTargetStyles = function (target) {

				var styles = "";

				styles += "width: " + target.w + "%;";
				styles += "height: " + target.h + "%;";
				styles += "top: " + target.t + "%;";
				styles += "left: " + target.l + "%;";

				return styles;
				
			};


		}
	}; 
});

var lizClickToCompleteInput = angular.module('lizClickToCompleteInput', []);

lizClickToCompleteInput.directive('clickToCompleteInput', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/click_to_complete_input.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@'
			
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.canvas = scope.options.canvas; // La imagen principal
			scope.titlecanvas = scope.options.titlecanvas; // title de La imagen principal
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			completedItems = 0;

			/**
			 * Definimos nuestra función beforeGoNext para que muestre el cuadro de felicitaciones
			 */
			scope.$root.beforeGoNext = function () {
				scope.success = true;
				return true; 
			};


			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getTargetsStyles = function (item) {
				var styles = '';

				styles += 'width: ' + item.w + 'px;';
				styles += 'height: ' + item.h + 'px;';
				styles += 'top: ' + item.t + '%;';
				styles += 'left: ' + item.l + '%;';

				/*// estilos personalizados
				if(opt.hasOwnProperty('customStyles')) styles += opt.customStyles;*/

				return styles;
			};
			/**
			 * Para obtener los estilos las calificaciones de los targets 
			 */
			scope.getTargetsStyles2 = function (item) {
				var styles = '';

				styles += 'width: ' + item.w + 'px;';
				styles += 'height: ' + item.h + 'px;';
				styles += 'top: ' + item.t + '%;';
				styles += 'left: ' + item.l + '%;';
				styles += 'background-size: ' + item.w + 'px;' + item.w + 'px;';
				/*// estilos personalizados
				if(opt.hasOwnProperty('customStyles')) styles += opt.customStyles;*/

				return styles;
			};

			

			/**
			 * Marca los elementos y verifica el final
			 */
			scope.verify = function (item) {
								
				if(/*item.completed ||*/ item.input === "") return;

				if( ((item.answer[0] === 'free') && (item.input.length >= item.length)) || ( item.answer.indexOf(item.input) > -1 )  ){
					item.completed = true;
					item.wrong = false;
					item.right = true;
					
				}else{

					item.right = false;
					item.wrong = true;					
				}

				var countCompleted = scope.items.filter(function(item){
					return item.completed;
				}).length;
				
				if(countCompleted === chances) {
					scope.$root.isNextEnabled = true; // Activa la flecha de siguiente
				}
			};

		}

    }; 
});

lizClickToCompleteInput.directive('popclick', function($timeout, $compile){
	return {
	    restrict: 'A',
			scope: {
				item: '=popoverItem',
				popoverText: '@',
				popoverPlacement: '@'
			},
	    link : function (scope, element, attrs) {
				var disable = false,
					isHidden = true,
					data = ''; // template del input

				data = '<input type="text" class="popover-input" ng-model="item.input" ng-blur="verifyInput()" placeholder="Escribe aqui">';
				scope.item.input = ''; // Añade el modelo para el input

				element.bind('click', function (e) {
					if(disable) return; // Solo se anima la primera vez

					$(element).popover({
						animation: true,
						placement: scope.popoverPlacement,
						trigger: 'manual',
						content: $compile(data)(scope),
						html : true
						/*content: scope.popoverText*/
						//container: 'body'
					});
					
					if(isHidden){
						$(element).popover('show');
						isHidden = false;
					}else{
						$(element).popover('destroy');
						isHidden = true;
					}

				});

				scope.verifyInput = function () {

					scope.$parent.verify(scope.item);
				};

    	}
	};
});



var lizClickToSelectPosition = angular.module('lizClickToSelectPosition', []);

lizClickToSelectPosition.directive('clickToSelectPosition', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/click_to_select_position.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@'
			
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.canvas = scope.options.canvas; // La imagen principal
			scope.titlecanvas = scope.options.titlecanvas; // title de La imagen principal
			scope.pattern = scope.items.pattern;
			scope.answer2 = scope.items.answer2;
			scope.selectedItem = false; // elemento seleccionado
			scope.selectedItem2 = false; // elemento seleccionado
			scope.selectedItemAux = false; // elemento seleccionado
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			completedItems = 0;
			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getTargetsStyles = function (item) {
				var styles = '';

				styles += 'width: ' + item.w + 'px;';
				styles += 'height: ' + item.h + 'px;';
				styles += 'top: ' + item.t + '%;';
				styles += 'left: ' + item.l + '%;';

				/*// estilos personalizados
				if(opt.hasOwnProperty('customStyles')) styles += opt.customStyles;*/

				return styles;
			};
			/**
			 * Para obtener los estilos las calificaciones de los targets 
			 */
			scope.getTargetsStyles2 = function (item) {
				var styles = '';

				styles += 'width: ' + item.w + 'px;';
				styles += 'height: ' + item.h + 'px;';
				styles += 'top: ' + item.t + '%;';
				styles += 'left: ' + item.l + '%;';
				styles += 'background-size: ' + item.w + 'px;' + item.w + 'px;';
				/*// estilos personalizados
				if(opt.hasOwnProperty('customStyles')) styles += opt.customStyles;*/

				return styles;
			};

			

			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {
			if(item.hasOwnProperty('isCompleted') || scope.selectedItem != false ) return;
				item.isCompleted = [];
				scope.selectedItemAux.select = [];
				scope.selectedItem = item; // seleccionamos el objeto
				scope.selectedItem.select = [];
				
			};

			/**
			 * Selecciona el objetivo indicado
			 */
			scope.selectItem2 = function (item) {
			if(scope.selectedItem === false ) return;

				scope.selectedItemAux = item; // seleccionamos el objeto

				if (scope.selectedItem.text === scope.selectedItemAux.text){
						item.wrong = false;
						item.right = true;
						scope.selectedItem = false; // borramos el elemento seleccionado		
						item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
						completedItems++;
						rightAnswers++
						scope.selectedItem2.target.wrong = false;
						
					

				}else{
					
					item.target = [];
					scope.selectedItem.wrong = true;
					scope.selectedItemAux.target.wrong = true;

					if(scope.selectedItem.select === true){
						
						/*if(!scope.selectedItem.hasOwnProperty('isCompleted')){*/
							
							completedItems++;
							scope.selectedItem.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
							scope.selectedItem = false; // elemento seleccionado
							scope.selectedItemAux.target.wrong = false;
							scope.selectedItem2.target.wrong = false;

						/*}*/
					}else{
						scope.selectedItem.word = [];
						scope.selectedItem.word.wrong = true;
						scope.selectedItem.select = true;
						scope.selectedItem2 = item;
					}
				}

				// Fin de la actividad
				if(completedItems === chances){

					if (rightAnswers >= minRightAnswers){
						scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
				}

				
			};	

			scope.random = function(){
    			return 0.5 - Math.random();
			};	

		}

		


    }; 
});




var lizCompareSample = angular.module('lizCompareSample', ['factories']);

lizCompareSample.directive('compareSample', function  (shuffleArrayFactory) {
    return {
        restrict: 'E',
		scope: {
			options: '=',
			description: '@'
		},
        templateUrl: '../views/activities/compare_sample.html',
		link: function postLink(scope, element, attrs) {

			scope.groups = shuffleArrayFactory.run(scope.options.groups); // Filas
			scope.chances = scope.options.hasOwnProperty('chances') ? scope.options.chances : scope.groups.length;
			scope.minRightAnswers = scope.options.hasOwnProperty('minRightAnswers') ? scope.options.minRightAnswers : scope.groups.length;
			scope.rightAnswers = 0; // respuestas correctas

			// variables que activan la pantalla de felicitaciones/vuelve a intentarlo
			scope.success = false;
			scope.failure = false;

			angular.forEach(scope.groups, function (group) {
				group.items = shuffleArrayFactory.run(group.items);
			});

			/**
			 * Obtiene los estilos de los items
			 */
			scope.getItemStyles = function (items) {
				return "width: " + (100 / items.length) + "%;";
			};

			/**
			 * Verifica si la respuesta es correcta/incorrecta
			 */
			scope.verify = function (item, group) {
				
				// Verificamos que el grupo no haya sido completado aún
				if(group.hasOwnProperty('_completed')) return;

				group._completed = true; //se define el grupo como terminado

				if(item.hasOwnProperty('answer')){
					// Respuesta Correcta
					item.isRight = true;
					scope.rightAnswers++;
				} else {
					// Respuesta Incorrecta
					item.isWrong = true;
				}

				scope.chances--;

				// Término de la actividad
				if (scope.chances === 0) {
					if(scope.rightAnswers >= scope.minRightAnswers){
						// éxito
						scope.success = true;
						scope.$root.isNextEnabled = true; // Activamos el botón de siguiente
					} else {
						// Fracaso
						scope.failure = true;
					}
				}
			};
		}
	}; 
});

var lizCompareSounds = angular.module('lizCompareSounds', ['factories']);

lizCompareSounds.directive('compareSounds', function  (shuffleArrayFactory) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			audio: '@',
			hideImages: '@',
			description: '@'
		},
		templateUrl: '../views/activities/compare_sounds.html',
		link: function postLink(scope, element, attrs) {

			var items = scope.options.items;

			// La diversión empieza aquí!!!
			scope.items = shuffleArrayFactory.run(items.slice(0));
			scope.audios = items.slice(0).filter(function(item){ return !item.hasOwnProperty('noSound'); });
			scope.selectedItem = false; // Elemento que se selecciona al dar click
			scope.chances = typeof scope.options.chances !== "undefined" ? scope.options.chances : scope.options.items.length;
			scope.rightAnswers = 0; // Contador de preguntas correctas

			// Recorremos los elementos para definir propiedades por defecto
			scope.items.forEach(function(item){
				if(! item.hasOwnProperty('type')) item.type = 'png';
				if(! item.hasOwnProperty('audio')) item.audio = item.resource;
			});

			/**
			 * Selecciona el item que se le pasa como parámetro. En este caso, se trata del 
			 * sonido seleccionado
			 */
			scope.selectItem = function (item) {
				if(item.isRight || item.isWrong) return;
				scope.selectedItem = item;
			}

			/**
			 * Compara el item seleccionado con el usuario con selectedItem
			 */
			scope.compareItems = function (item) {
				// Si no se ha selecionado ningún item, se no se hace nada
				if (!scope.selectedItem) return;

				if(scope.selectedItem === item){
					// Respuesta correcta: Son iguales
					scope.selectedItem.isRight = true;
					scope.rightAnswers++;

				} else {
					// Respuesta incorrecta
					scope.selectedItem.isWrong = true;
				}

				// Reducimos las posibilidades y devolvemos a selectedItem a su estado inicial
				scope.chances--;
				scope.selectedItem = false;

			console.log(scope.chances);
				// Fin de la actividad
				if(scope.chances === 0){
					if(scope.rightAnswers >= scope.options.minRightAnswers){
						scope.success = true;	
						scope.$root.isNextEnabled = true; // Activamos la siguiente actividad
					} else {
						scope.failure = true;
					}
				}
			};

		}
	}; 
});

var lizComplementary = angular.module('lizComplementary', []);

lizComplementary.directive('complementary', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/complementary.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			
			link = scope.options.link
			link2 = scope.options.link2
			link3 = scope.options.link3
			link4 = scope.options.link4

			scope.success = false;
			scope.failure = false;
			scope.block = false;
			
			var visitedlink = false;
			var visitedlink2 = scope.options.link2 ? false : true;
			var visitedlink3 = scope.options.link3 ? false : true;
			var visitedlink4 = scope.options.link4 ? false : true;

			scope.verify = function (item) {
				
				if(item === link) {visitedlink = true}
				if(item === link2){visitedlink2 = true};
				if(item === link3){visitedlink3 = true};
				if(item === link4){visitedlink4 = true};

				if ((visitedlink === true) && (visitedlink2 === true) && (visitedlink3 === true) && (visitedlink4 === true)){

					scope.$root.isNextEnabled = true;
					scope.success = true;
				}

			}; // verify()


			

		}


    }; 
});


var lizComplementary2 = angular.module('lizComplementary2', []);

lizComplementary2.directive('complementary2', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/complementary2.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			mainimg: "@",
			mainalt: "@"
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			
			scope.caseLinks = scope.options.caseLinks;
			scope.success = false;
			scope.failure = false;
			scope.block = false;

			angular.forEach(scope.caseLinks, function (value, key) {
				value.visited = false;
			});
			
			var counter = 0;
			scope.verify = function (item) {
				
				item.visited = true;

				counter++;

				if (scope.caseLinks.length === counter) {

					scope.$root.isNextEnabled = true;
					scope.success = true;
				}

			}; // verify()


			/**
			 * Devuelve los estilos de cada elemento
			 */
			scope.getStyles = function (item) {
				var styles = '';

				styles += "top: " + item.t + "%;";
				styles += "left: " + item.l + "%;";
				styles += "width: " + item.w + "px;";
				styles += "height: " + item.h + "px;";
				
				return styles;
			};

		}


    }; 
});


/**
 * La actividad permite completar inputs dentro de un "canvas".
 */
var lizCompleteInputParts = angular.module('lizCompleteInputParts', []);

lizCompleteInputParts.directive('completeInputParts', function () {
	return {
		restrict: 'E',
        templateUrl: '../views/activities/complete_input_parts.html',
        scope: {
            options: '=',
            instruction: '@',
            title: '@',
            description: '@',
            audio: '@'
        },
		link: function (scope, iElement, iAttrs) {
			scope.canvasBlocks = scope.options.canvasBlocks;

			scope.itemsLength = 0;
			scope.rightAnswers = 0;
			scope.complete = false; // Cuando termina la actividad
			scope.block = false;
			scope.success = false;
			scope.failure = false;

			angular.forEach(scope.canvasBlocks, function (value, key) {
				scope.itemsLength += value.items.length;
			})

			// watch if the activity is finished
			scope.$watch('complete', function(complete) {
				if (complete) {
					if (scope.rightAnswers >= scope.itemsLength ) {
						// éxito
						scope.success = true;

						// Activamos la siguiente actividad o ruta
						scope.$root.isNextEnabled = true;
					} else {
						// fracaso
						scope.failure = true;
					}
				} 
			});

			var counter = 0;
			var chances = scope.options.chancesPerItem-1;

			// si la opcion default esta completa el item
		    scope.canvasBlocks.forEach(function (q) {
		      q.items.forEach(function (i) {

			       	if(i.default){
			       		scope.rightAnswers++;
			       		i.right = true;
			       		i.block = true;
			       		i.input = i.answer;
			       		counter++;			       		
			       	}
			      
		       });
		    });

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;

			scope.verify = function (item) {
				if (null == item.input || "" === item.input) { return; }

				if (item.input.toLowerCase() === item.answer.toLowerCase()) {
					scope.rightAnswers++;
					item.wrong = false;
					item.right = true;
					item.block = true; // marcamos el item como completo, para desactivar el input
					counter++;
				} else {
					item.wrong ? chances=scope.options.chancesPerItem-2: chances=scope.options.chancesPerItem-1;

                	item.wrong = true;
                	

                    	if(chances === 0){
                    	item.block = true;
                    	item.input = item.answer;
                    	counter++;
                    	chances=scope.options.chancesPerItem-1;
                    	}else{chances--;item.input="";}
				}

				if(counter === scope.itemsLength){
                    
                    scope.complete = true;
                	
                }

                scope.$apply();
			}

			/**
			 * Devuelve los estilos de cada elemento
			 */
			scope.getStyles = function (item) {
				var styles = '';

				styles += "top: " + item.t + "%;";
				styles += "left: " + item.l + "%;";

				item.w ? styles += "width: " + item.w + "%;" : '' ;	

				return styles;
			};
		}
	};
});
/**
 * La actividad permite completar palabras en inputs
 */
var lizCompleteInputs = angular.module('lizCompleteInputs', []);

lizCompleteInputs.directive('completeInputs', function(){
	return  {
		restrict: 'E',
		templateUrl: '../views/activities/complete_inputs.html',
		scope: {
			inputs: "=",
			description: '@'
		},
		link: function(scope, element, attrs){
			// Inputs procesados
			scope.words = [];

			// Procesamos cada elemento del array entrante
			angular.forEach(scope.inputs, function (input) {
				scope.words.push({ word: input, right: false, wrong: false });
			});

			scope.rightAnswers = 0; // número de respuestas correctas
			scope.complete = false; // Cuando termina la actividad

			scope.success = false;
			scope.failure = false;

			// watch if the activity is finished
			scope.$watch('complete', function(complete) {
				if (complete) {
					if (scope.rightAnswers >= 3) {
						// éxito
						scope.success = true;

						// Activamos la siguiente actividad o ruta
						scope.$root.isNextEnabled = true;
					} else {
						// fracaso
						scope.failure = true;
					}
				}
			});

		}
	};
});

lizCompleteInputs.directive('compare', function () {
    return {
        scope: {
            compare: '=compare',
            counter: '=counter',
            complete: '=complete'
        },
        link: function (scope, element, attrs) {
            element.bind('keyup', function () {
                if (element.val().length == scope.compare.word.length) {
                    // Good answer -> increase good answers
                    if (element.val() === scope.compare.word) {
                        scope.compare.right = true;
                    } else {
                        scope.compare.wrong = true;
                    }

                    scope.counter++;

                    element.attr('disabled', 'disabled');
                    var inputs = element.closest('form').find(':input:visible');

                    if(scope.counter === inputs.length){
                    	
                        scope.complete = true;
                    	
                    }

                    inputs.eq(inputs.index(element) + 1).focus();

                    scope.$apply();
                }
            });
        }
    }
});


/**
 * La actividad permite completar palabras en inputs
 */
var lizCompleteInputsDescription = angular.module('lizCompleteInputsDescription', []);

lizCompleteInputsDescription.directive('completeInputsDescription', function ($sce) {
  return {
    restrict: 'E',
    templateUrl: '../views/activities/complete_inputs_description.html',
    scope: {
      options: "=",
      title: '@',
      correctAnswer: '@',
      description: '@',
      instruction: '@',
      titleBlock: '@',
      audio: '@',
      tableTextTitle: '@',
      inputTextTitle: '@'
    },
    link: function (scope, element, attrs) {
      var opt = scope.options;

      // Inputs procesados
      scope.words = [];

      // Procesamos cada elemento del array entrante
      angular.forEach(scope.inputs, function (input) {
        scope.words.push({ word: input, right: false, wrong: false });
      });

      scope.feedback = opt.hasOwnProperty('feedback') ? opt.feedback : false;

      scope.extension = opt.extension ? opt.extension : '.png';
      scope.complete = false; // Cuando termina la actividad
      scope.hideDescription = scope.options.hideDescription;
      scope.descriptionTop = scope.options.descriptionTop;
      scope.itemsPerRow = scope.options.itemsPerRow;
      scope.block = false;

      scope.rightAnswers = 0; // número de respuestas correctas
      scope.success = false;
      scope.failure = false;

      // watch if the activity is finished
      scope.$watch('complete', function (complete) {
        if (complete) {

          if (scope.rightAnswers >= minRightAnswers) {
            // éxito
            scope.success = true;

            // Activamos la siguiente actividad o ruta
            scope.$root.isNextEnabled = true;
          } else {
            // fracaso
            scope.failure = true;
          }
        }
      });

      // Permite el uso de html
      scope.sanitize = function (item) {
        return $sce.trustAsHtml(item);
      };

      // ordena el array de forma aleatoria usando el algoritmo de Fisher-Yates
      self.shuffleArray = function (array) {
        for (var i = array.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var temp = array[i];
          array[i] = array[j];
          array[j] = temp;
        }
        return array;
      };

      scope.items = scope.options.data,
        minRightAnswers = scope.options.minRightAnswers,
        randomItems = scope.options.randomItems ? true : false,
        scope.description_data = scope.options.data.slice(0);   // Clonamos el array para empezar a trabajar

      if (randomItems) {
        data = self.shuffleArray(scope.items);
      }

      // Si la descripción o el título están, entonces la instrucción va al fondo
      scope.isBottom = scope.title || scope.description;


      /**
       * Para obtener los estilos de los elementos, específicamente el ancho
       */
      scope.getStyles = function () {
        var styles = "";

        if (scope.itemsPerRow) {
          styles += "width: " + (100 / scope.itemsPerRow) + "%;";
        } else {
          styles += "width: " + (100 / (scope.options.data.length + 2)) + "%;";
          styles += "margin-left: " + (100 / (scope.options.data.length * 4)) + "%;";
        }

        return styles;
      };

      /**
       * Función de Jeison
       */
      var counter = 0,
        chances = scope.options.chancesPerItem - 1;

      /**
       * Verifica los inputs y da fin a la actividad.
       * @param input
       */
      scope.verify = function (input) {
        // aquí se hace lo que quiera con el input
        // Good answer -> increase good answers
        if ( ((input.correctAnswer.toLowerCase() === input.input.toLowerCase()) && (input.input != "" )) || input.correctAnswer.toLowerCase() === 'free') {
          input.wrong = false;
          input.right = true;
          input.block = true;
          scope.rightAnswers++;

          counter++;
        }

        if ((input.correctAnswer.toLowerCase() != input.input.toLowerCase()) && ((input.input != null ) && (input.input != "" ) && (input.correctAnswer.toLowerCase() != "free" ))) {
          input.wrong ? chances = scope.options.chancesPerItem - 2 : chances = scope.options.chancesPerItem - 1;
          input.wrong = true;

          if (chances === 0) {
            input.block = true;
            counter++;
            chances = scope.options.chancesPerItem - 1;
          } else {
            chances--;
            input.input = "";
          }
        }

        if (counter === scope.options.data.length) {
          // Solamente activa la flecha, permitiendo al estudiante ver la realimentación
          scope.$root.isNextEnabled = true;

          if(scope.feedback) {
            scope.showFeedback = true;
          } else {
            scope.complete = true;
          }
        }
      };

      // If feedback is activated, show the feedback
      if(scope.feedback) {
        scope.$root.beforeGoNext = function () {
          if (scope.rightAnswers >= minRightAnswers) {
            scope.success = true;
            return true;
          } else {
            scope.failure = true;
            return false;
          }
        };
      }

    }
  };
});


var lizCompleteInputsFree = angular.module('lizCompleteInputsFree', []);

lizCompleteInputsFree.directive('completeInputsFree', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/complete_inputs_free.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.pattern = scope.items[0].pattern;
			scope.words = [];
			minRightAnswers = scope.options.minRightAnswers //MAria Giraldo -> Se utiliza para validar la cantidad de letras en la caja de texto
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.items[0].pattern.length * 1, // el doble, ya que es izquierda y derecha
			scope.success = false;
			scope.failure = false;
			scope.block = false;

			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow){
					styles += "width: " + (100 / scope.itemsPerRow) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-right: " + (10 / scope.itemsPerRow) + "%!important;";
				} else {
					styles += "width: " + (100 / scope.items.length) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
				}
				
				return styles;

				
			};

			

			/**
			 * Definimos nuestra función beforeGoNext para que muestre el cuadro de felicitaciones
			 */
			scope.$root.beforeGoNext = function () {
				scope.success = true;
				return true; 
			};

			/**
			 * Verifica si el input cumple con las condiciones del número 
			 */
			 var chancesPerItem = 1

			scope.verify = function (item) {

				if(item.input === '') return; 

				
				//if (item.input.length >= 15){ //COmentado por Maria Giraldo, para poner numero de letras dinámico

                /*
                * Maria Giraldo
                * Validación temporal para no afectar el numero estatico de 15 letras
                * if (minRightAnswers !== 30) minRightAnswers = 15; (*)
                * -- La validación dinámica del numero de letras, aplica al 100% si se elimina esta validación (*).
                * Por el momento funciona para 30 caracteres
                * */
                if (minRightAnswers !== 30) minRightAnswers = 15;

                if (item.input.length >= minRightAnswers){

                    scope.$root.isNextEnabled = true;

                }

					/*// fin de la actividad
					if(chances === 0){
						if(rightAnswers >= minRightAnswers){
							
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} */
					
			}; // verify()



		}


    }; 
});


var lizCompleteInputsPosition = angular.module('lizCompleteInputsPosition', []);

lizCompleteInputsPosition.directive('completeInputsPosition', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/complete_inputs_position.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@'
			
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.canvas = scope.options.canvas; // La imagen principal
			scope.canvasalt = scope.options.canvasalt;
			scope.imgStyle = scope.options.imgStyle; // estilos de La imagen principal
			scope.examples = scope.options.examples;
			scope.pattern = scope.items.pattern;
			scope.answer2 = scope.items.answer2;
			minRightAnswers = scope.options.minRightAnswers
			chancesPerItem = scope.options.chancesPerItem ? scope.options.chancesPerItem : 1
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			completedItems = 0;

			// Recorremos todos los items
			      scope.items.forEach(function (item) {
			        
		      		if (item.default){

		      			item.complete = [];

		      			item.complete.push({
						  complete: true,								      
						});

						rightAnswers++;
						chances--;
						item.wrong = false;
						item.right = true;
						item.completed = true; // marcamos el item como completo, para desactivar el input
						item.input = item.pattern ;

		      		}

			      });
			/**


			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getTargetsStyles = function (item) {
				var styles = '';

				styles += 'width: ' + item.w + 'px;';
				styles += 'height: ' + item.h + 'px;';
				styles += 'top: ' + item.t + '%;';
				styles += 'left: ' + item.l + '%;';

				/*// estilos personalizados
				if(opt.hasOwnProperty('customStyles')) styles += opt.customStyles;*/

				return styles;
			};
			/**
			 * Para obtener los estilos las calificaciones de los targets 
			 */
			scope.getTargetsStyles2 = function (item) {
				var styles = '';

				styles += 'width: ' + item.w + 'px;';
				styles += 'height: ' + item.h + 'px;';
				styles += 'top: ' + item.t + '%;';
				styles += 'left: ' + item.l + '%;';
				styles += 'background-size: ' + item.w + 'px;' + item.w + 'px;';
				/*// estilos personalizados
				if(opt.hasOwnProperty('customStyles')) styles += opt.customStyles;*/

				return styles;
			};

			

			

			scope.verify = function (item) {

				if((item.input === '' ) || ! item.hasOwnProperty('input')) return;

					item.complete = [];					
					

						if( item.pattern.indexOf(item.input) > -1  || item.pattern[0] === "free" ){
								
								item.complete.push({
									  complete: true,								      
								});
								

						} 

						else{
							
						}			


				// Si se han completado todos
					
				if (item.complete.length >= 1) {
							
							rightAnswers++;
							chances--;
							item.wrong = false;
							item.right = true;
							item.completed = true; // marcamos el item como completo, para desactivar el input
							
					} 
					else {
							item.wrong ? chancesPerItem = scope.options.chancesPerItem ? scope.options.chancesPerItem - 1 : chancesPerItem = 1 : chancesPerItem = scope.options.chancesPerItem ? scope.options.chancesPerItem : chancesPerItem = 1 ;
							chancesPerItem--	
							item.wrong = true;
								if(chancesPerItem === 0){
		                    	item.completed = true;
		                    	item.input = item.pattern;
		                    	chances--;
		                    	chancesPerItem = scope.options.chancesPerItem ? scope.options.chancesPerItem : 1
		                    	}
		                    	else{item.input="";}

					}

					// fin de la actividad
					if(chances === 0){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} 					
			}; // verify()

				

				
			

			

		}

		


    }; 
});




/**
 * La actividad permite completar inputs con falso "F" o verdadero "V".
 */
var lizCompleteInputsTrueFalse = angular.module('lizCompleteInputsTrueFalse', []);

lizCompleteInputsTrueFalse.directive('completeInputsTrueFalse', function () {
	return {
		restrict: 'E',
		templateUrl: '../views/activities/complete_inputs_true_false.html',
 		scope: {
 			options: '=',
 			instruction: '@',
 			title: '@',
 			description: '@',
 			audio: '@'
 		},
		link: function (scope, iElement, iAttrs) {
			// Inputs procesados
			scope.words = [];

			// Procesamos cada elemento del array entrante
			angular.forEach(scope.inputs, function (input) {
				scope.words.push({ word: input, right: false, wrong: false });
			});

			scope.rightAnswers = 0;
			scope.complete = false; // Cuando termina la actividad
			scope.block = false;
			scope.success = false;
			scope.failure = false;

			// watch if the activity is finished
			scope.$watch('complete', function(complete) {
				if (complete) {
					if (scope.rightAnswers >= scope.options.data.length || scope.rightAnswers >= scope.options.minRightAnswers) {
						// éxito
						scope.success = true;

						// Activamos la siguiente actividad o ruta
						scope.$root.isNextEnabled = true;
					} else {
						// fracaso
						scope.failure = true;
					}
				} 
			});

			scope.items = scope.options.data;
			if (scope.options.aOptions) {
				scope.aOptions = scope.options.aOptions;
			}

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;

			var counter = 0
			var chances = scope.options.chancesPerItem-1

			scope.verify = function (item) {
				if ((item.input == null ) || (item.input == "" )) return;

				// Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
				if(item.input.toLowerCase() === item.answer.toLowerCase()){
					scope.rightAnswers++;
					item.wrong = false;
					item.right = true;
					item.block = true; // marcamos el item como completo, para desactivar el input
					counter++;
				} else {
					
					item.wrong ? chances=scope.options.chancesPerItem-2: chances=scope.options.chancesPerItem-1;

                	item.wrong = true;
                	

                    	if(chances === 0){
                    	item.block = true;
                    	item.input = item.answer;
                    	counter++;
                    	chances=scope.options.chancesPerItem-1;
                    	}else{chances--;item.input="";}
				}

				if(counter === scope.options.data.length){
                    	
                    scope.complete = true;
                	
                }
			}
		}
	};
});
var lizCompleteLetters = angular.module('lizCompleteLetters', []);

lizCompleteLetters.factory('completeLettersActivity', function ($rootScope) {

  var completeLettersActivity = {};

  /**
   * Crea el ViewModel. Aquí es donde ocurre la magia. SUPER IMPORTANTE.
   */
  completeLettersActivity.create = function (options) {
    var processedData = [];

    angular.forEach(options.items, function (item) {
      processedData.push(new Item(item.resource, item.name, item.pattern));
    });

    options.items = processedData;

    return new completeLettersActivity._ViewModel(options);
  };


  // Clase necesaria para convertir cada letra en un input
  var Letter = function (letter, isInput) {
    this.letter = letter;
    this.input = isInput;
    this.value = ko.observable(''); // used for the user input
    this.lastValue = ko.observable();
    this.chances =  1
  };

  // Cada elemento de items que se ingrese debe ser convertido para generar los objetos Letter
  var Item = function (resource, name, positions) {
    var self = this;

    self.resource = resource;
    self.name = [];

    // Constructor
    // Recorre el array comparando las posiciones y configurando los inputs
    $.each(name.split(''), function (key, value) {
      if ($.inArray(key, positions) !== -1) {
        self.name.push(new Letter(value, true));
      } else {
        self.name.push(new Letter(value, false));
      }
    });
    console.log(self.name)
  };

  /**
   * Genera el ViewModel de las parejas con sus funcionalidades
   *
   * Recibe un objeto con las siguientes propiedades
   *
   * @param {object}    options            Opciones a utilizar.
   * @param {object}    options.items        Elementos con las letras a completar
   * @param {object}    options.chances        Oportunidades para realizar la actividad
   * @param {object}    options.minRightAnswers    Número mínimo de respuestas buenas
   * @param {object}    options.resources      directorio de recursos
   */
  completeLettersActivity._ViewModel = function (options) {
    // Inicialización de variables
    var self = this;

    self.items = ko.observableArray(options.items);
    self.chances = ko.observable(options.chances ? options.chances : options.items.length);
    self.rightAnswers = ko.observable(0);
    self.minRightAnswers = options.minRightAnswers;
    self.resources = options.resources;
    self.itemsPerRow = typeof options.itemsPerRow !== "undefined" ? options.itemsPerRow : 4;
    self.chancesPerItem = typeof options.chancesPerItem !== "undefined" ? options.chancesPerItem : 1;

    // audio
    self.audio = ko.observable(options.audio);

    // Si está buena, va al siguiente input
    self.verifyAnswer = function (item, e) {
      var input = e.currentTarget;

      if (item.value() !== '') {
        if (item.value() == item.letter) {
          // Es correcto
          self.rightAnswers(self.rightAnswers() + 1);
          self.chances(self.chances() - 1);
          input.disabled = 'disabled'; // desabilita el input

          // Va al siguiente input. Necesario que todo esté dentro de un elemento FORM
          var inputs = $(input).closest('form').find(':input:visible');
          inputs.eq(inputs.index(input) + 1).focus(); // Esta es la función de salto al siguiente input
        } else {
          // Incorrecto
          item.chances++
          if(item.chances > self.chancesPerItem){
            item.lastValue(item.value());
            self.chances(self.chances() - 1);
            console.log(item);
            item.value = item.letter;
            input.disabled = 'disabled'; // desabilita el input
            // Va al siguiente input. Necesario que todo esté dentro de un elemento FORM
            var inputs = $(input).closest('form').find(':input:visible');
            inputs.eq(inputs.index(input) + 1).focus(); // Esta es la función de salto al siguiente input
          }
        }

        
      }
    };

    /**
     * Reproduce el audio de la instrucción.
     */
    self.playAudio = function () {
      $('#audio-instruction')[0].play();
    };

    // Limpia el input después de teclear
    self.clearInput = function (item, e) {
      if (item.value() !== '' && item.value() != item.letter) {
        item.value(String.fromCharCode(e.charCode)); // set the pressed key
      }

      return true;
    };

    // Define el éxito de la actividad
    self.success = ko.computed(function () {
      // Activamos la siguiente
      if (self.chances() === 0 && self.rightAnswers() >= self.minRightAnswers) {
        $rootScope.isNextEnabled = true;
      }

      return self.chances() === 0 && self.rightAnswers() >= self.minRightAnswers;
    });

    // Define el fracaso de la actividad
    self.failure = ko.computed(function () {
      return self.chances() === 0 && self.rightAnswers() < self.minRightAnswers;
    });
  };


  /**
   * Inicializa la instancia del ViewModel creado con pairsActivity.create
   *
   * @param {object} instance Intancia del VM de knockout
   */
  completeLettersActivity.run = function (instance) {
    ko.cleanNode($('#main-container')[0]);
    ko.applyBindings(instance, $('#main-container')[0]);
  };

  return completeLettersActivity;
});


lizCompleteLetters.directive('completeLetters', function (completeLettersActivity) {
  return {
    restrict: 'E',
    templateUrl: '../views/activities/complete_letters.html',
    scope: {
      options: '=',
      description: '@',
      letter: '@',
      audio: '@'
    },
    link: function postLink(scope, element, attrs) {
      // Corremos la aplicación
      // Añadimos el audio a options
      scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;
      scope.options.resources = scope.$root.resources;
      completeLettersActivity.run(completeLettersActivity.create(scope.options));
    }
  };
});


var lizCompleteMultitable = angular.module('lizCompleteMultitable', []);

lizCompleteMultitable.directive('completeMultitable', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/complete_multitable.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			titleBlock: '@',
			blockText: '@',
			mainimg: '@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.groups = scope.options.groups;
			scope.items = [];
			scope.list = scope.options.list;
			scope.words = [];
			scope.wordIn = false;
			scope.count = false;
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.itemsStyle = scope.options.itemsStyle;
			scope.groupsStyle = scope.options.groupsStyle;
			scope.success = false;
			scope.failure = false;
			scope.block = false;


			// Recorremos todos los grupos y sus items
			      scope.groups.forEach(function (group) {
			        group.items.forEach(function (item) {
			          // agregamos cada item a el array de items
			          scope.items.push({
							item: item,								      
					  });

			        });
			      });


			var items = scope.items;

		   // Constructor de palabras
		   for(var j=0; j < items.length; j++){

			   	var string = items[j].item.text;
				var words = string.split(" ");

				scope.items[j].item.words = [];

				
				
				for(var i=0; i < words.length; i++){

							scope.items[j].item.words.push({
								  isInput: true,
							      input: '',
							      word: (words[i]),
							});
				}
					console.log(scope.items[j].item.words);
			}


			/**
			 * Verifica si el input cumple con las condiciones del número 
			 */
			
			scope.verify = function (item,word,pattern,items) {
				var chancesPerItem = 1
				if(word.wrong === true){chancesPerItem = 0}
				
					// Recorremos el grupo y sus items
			        pattern.forEach(function (wordx) {
			        	
			        	if(item === wordx.input && item != ''){
			        		scope.count ++
		          		}				      
					  
			        });			     

			      	if(scope.count >= 2){
	          			scope.wordIn = true
	          			scope.count = 0
	          		}else{scope.wordIn = false;scope.count = 0}

				if(item === '' || scope.wordIn === true) return; 
				
				// Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
				for(var i=0; i < pattern.length; i++){
					if( item.indexOf(pattern[i].word) > -1 ){
						rightAnswers++;
						chances--;
						word.wrong = false;
						word.right = true;
						word.completed = true; // marcamos el item como completo, para desactivar el input
						break
					} else {
						
						if(items.hasOwnProperty('answer2')){
							if(item === items.answer2){
								chances--;
								word.wrong = false;
								word.right = true;
								word.completed = true; // marcamos el item como completo, para desactivar el input
								break
							}else{
							       	word.right = false;
									word.wrong = true;
	                    		}
						}else {
						
							word.right = false;
							word.wrong = true;
                    	}
					}

				}
					
					if(word.wrong === true && chancesPerItem === 0){
						word.completed = true; // marcamos el item como completo, para desactivar el input
						chancesPerItem = 1
						chances--;
						item ="";
					}else{chancesPerItem = 0 ;}

					// fin de la actividad
					if(chances === 0){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} 
					
			}; // verify()



		}


    }; 
});


/**
 * La actividad permite completar inputs en un table de acuerdo a 
 * las imagenes que se hubican en la primera columna.
 */
var lizCompleteTableImageInputs = angular.module('lizCompleteTableImageInputs', []);

 lizCompleteTableImageInputs.directive('completeTableImageInputs', function () {
 	return {
 		restrict: 'E',
 		templateUrl: '../views/activities/complete_table_image_inputs.html',
 		scope: {
 			options: '=',
 			instruction: '@',
 			title: '@',
 			description: '@',
 			audio: '@',
 			mainimg: '@',
 			alt: '@'
 		},
 		link: function (scope, iElement, iAttrs) {
 			// Inputs procesados
			scope.words = [];

			// Procesamos cada elemento del array entrante
			angular.forEach(scope.inputs, function (input) {
				scope.words.push({ word: input, right: false, wrong: false });
			});

			scope.textImageTitle = scope.options.textImageTitle;
			scope.textInput1Title = scope.options.textInput1Title;
			scope.textInput2Title = scope.options.textInput2Title;
			scope.rightAnswers = 0;
			scope.complete = false; // Cuando termina la actividad
			scope.block = false;
			scope.success = false;
			scope.failure = false;

			// watch if the activity is finished
			scope.$watch('complete', function(complete) {
				if (complete) {
					if (scope.rightAnswers >= scope.options.minRightAnswers) {
						// éxito
						scope.success = true;

						// Activamos la siguiente actividad o ruta
						scope.$root.isNextEnabled = true;
					} else {
						// fracaso
						scope.failure = true;
					}
				} 
			});

			scope.items = scope.options.data;

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;

			var counter = 0;
			var chances = scope.options.chancesPerItem-1;

			scope.verify = function (obj) {
				if ((obj.input == null ) || (obj.input == "" )) return;

				// Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
				if(obj.input.toLowerCase() === obj.tableText.toLowerCase()){
					scope.rightAnswers++;
					obj.wrong = false;
					obj.right = true;
					obj.completed = true; // marcamos el item como completo, para desactivar el input
					counter++;
				} else {
					
					obj.wrong ? chances=scope.options.chancesPerItem-2: chances=scope.options.chancesPerItem-1;

                	obj.wrong = true;
                	

                    	if(chances === 0){
                    	obj.block = true;
                    	counter++;
                    	chances=scope.options.chancesPerItem-1;
                    	}else{chances--;obj.input="";}
				}

				if(counter === (scope.options.data.length * 2)){
                    	
                    scope.complete = true;
                	
                }
                
                scope.$apply();
			}
 		}
 	};
 });
/**
 * La actividad permite completar inputs en un table de acuerdo a 
 * unas condiciones.
 */

var lizCompleteTableInputs = angular.module('lizCompleteTableInputs', []);

lizCompleteTableInputs.directive('completeTableInputs', function () {
 	return {
 		restrict: 'E',
 		templateUrl: '../views/activities/complete_table_inputs.html',
 		scope: {
 			options: '=',
 			instruction: '@',
 			audio: '@'
 		},
 		link: function (scope, iElement, iAttrs) {
 			console.log(iAttrs);
			// Inputs procesados
			scope.words = [];

			// Procesamos cada elemento del array entrante
			angular.forEach(scope.inputs, function (input) {
				scope.words.push({ word: input, right: false, wrong: false });
			});

			scope.tableTextTitle = scope.options.tableTextTitle;
			scope.inputTextTitle = scope.options.inputTextTitle;
			scope.rightAnswers = 0;
			scope.complete = false; // Cuando termina la actividad
			scope.block = false;
			scope.success = false;
			scope.failure = false;

			// watch if the activity is finished
			scope.$watch('complete', function(complete) {
				if (complete) {
					if (scope.rightAnswers >= scope.options.data.length) {
						// éxito
						scope.success = true;

						// Activamos la siguiente actividad o ruta
						scope.$root.isNextEnabled = true;
					} else {
						// fracaso
						scope.failure = true;
					}
				} 
			});

			scope.items = scope.options.data;

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;

			var counter = 0
			var chances = scope.options.chancesPerItem-1

			scope.verify = function (input) {
				// aquí se hace lo que quiera con el input
				var letters = /^[A-Za-z]+$/;

				if((input.input.match(letters) !== null) && (input.input !="" )) {
                    	
                	input.wrong = false;
                    input.right = true;
                    input.block = true;
                    scope.rightAnswers++;
                    counter++;
                                                                   
                }

                if((input.input.match(letters) === null) && ((input.input != null ) && (input.input != "" ))) {
	                    	
	                    	
                    	input.wrong ? chances=scope.options.chancesPerItem-2: chances=scope.options.chancesPerItem-1;

                    	input.wrong = true;
                    	

	                    	if(chances === 0){
	                    	input.block = true;
	                    	counter++;
	                    	chances=scope.options.chancesPerItem-1;
	                    	}else{chances--;input.input="";}
            	}

            	if(counter === scope.options.data.length){
                    	
                    scope.complete = true;
                	
                }
                
			}
 		}
 	};
});
/**
 * La actividad permite completar inputs en hubicaciones aleatorias 
 * en un table.
 */
var lizCompleteTableRandomInputs = angular.module('lizCompleteTableRandomInputs', []);

 lizCompleteTableRandomInputs.directive('completeTableRandomInputs', function ($sce) {
 	return {
 		restrict: 'E',
 		templateUrl: '../views/activities/complete_table_random_inputs.html',
 		scope: {
 			options: '=',
 			instruction: '@',
 			title: '@',
 			description: '@',
 			audio: '@'
 		},
 		link: function (scope, element, iAttrs) {

			scope.sanitize = function (item) {
				return $sce.trustAsHtml(item);
			};

			// ordena el array de forma aleatoria usando el algoritmo de Fisher-Yates
			scope.shuffleArray = function(array) {
				for (var i = array.length - 1; i > 0; i--) {
					var j = Math.floor(Math.random() * (i + 1));
					var temp = array[i];
					array[i] = array[j];
					array[j] = temp;
				}
				return array;
			};

			scope.items = scope.options.items;
			scope.titles = scope.options.titles;
			scope.rightAnswers = 0;
			scope.complete = false; // Cuando termina la actividad
			scope.block = false;
			scope.minRightAnswers = scope.options.minRightAnswers;
			scope.success = false;
			scope.failure = false;
			scope.numInputs = 0;

			angular.forEach(scope.items, function (item, key) {
				angular.forEach(item.objs, function (obj, k) {
					if (obj.isInput) {
						obj.chances = scope.options.chancesPerItem - 1;
						obj.right = false;
						obj.wrong = false;
						scope.numInputs++;
					}
				});
			});

			// watch if the activity is finished
			scope.$watch('complete', function(complete) {
				if (complete) {
					if (scope.rightAnswers >= scope.minRightAnswers) {
						// éxito
						scope.success = true;

						// Activamos la siguiente actividad o ruta
						scope.$root.isNextEnabled = true;
					} else {
						// fracaso
						scope.failure = true;
					}
				} 
			});

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;

			var counter = 0;

			scope.verify = function (obj) {
				if ("" === obj.input || null === obj.input) { return; }
				
				// Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
				if(obj.input.toLowerCase() === obj.answer.toLowerCase()){
					scope.rightAnswers++;
					obj.wrong = false;
					obj.right = true;
					obj.block = true; // marcamos el item como completo, para desactivar el input
					counter++;
				} else {
					
					// item.wrong ? chances=scope.options.chancesPerItem-2: chances=scope.options.chancesPerItem-1;

                	obj.wrong = true;

                    	if(obj.chances === 0){
                    	obj.block = true;
                    	obj.input = obj.answer;
                    	counter++;
                    	obj.chances=scope.options.chancesPerItem-1;
                    	}else{obj.chances--;obj.input="";}
				}

				if(counter === scope.numInputs){
                    	
                    scope.complete = true;
                	
                }
			}
 		}
 	};
 });
/**
 * La actividad permite completar inputs en un table de acuerdo a 
 * una lista lateral.
 */
var lizCompleteTableWithList = angular.module('lizCompleteTableWithList', []);

 lizCompleteTableWithList.directive('completeTableWithList', function ($sce) {
 	return {
 		restrict: 'E',
 		templateUrl: '../views/activities/complete_table_with_list.html',
 		scope: {
 			options: '=',
 			instruction: '@',
 			title: '@',
 			description: '@',
 			audio: '@'
 		},
 		link: function (scope, element, iAttrs) {
 			// Inputs procesados
			scope.words = [];

			// Procesamos cada elemento del array entrante
			angular.forEach(scope.inputs, function (input) {
				scope.words.push({ word: input, right: false, wrong: false });
			});

			scope.sanitize = function (item) {
				return $sce.trustAsHtml(item);
			};

			scope.number = 7;
			scope.getNumber = function(num) {
			    return new Array(num);   
			};

			// ordena el array de forma aleatoria usando el algoritmo de Fisher-Yates
			scope.shuffleArray = function(array) {
				for (var i = array.length - 1; i > 0; i--) {
					var j = Math.floor(Math.random() * (i + 1));
					var temp = array[i];
					array[i] = array[j];
					array[j] = temp;
				}
				return array;
			};

			scope.textInput1Title = scope.options.textInput1Title;
			scope.textInput2Title = scope.options.textInput2Title;
			scope.textInput3Title = scope.options.textInput3Title;
			scope.rightAnswers = 0;
			scope.complete = false; // Cuando termina la actividad
			scope.block = false;
			scope.minRightAnswers = scope.options.minRightAnswers
			scope.success = false;
			scope.failure = false;
			scope.inputs =  scope.options.data;
			scope.randomItems = (scope.options.randomItems) ? true : false;
			console.log(scope.randomItems);

			scope.items = [];
			angular.forEach(scope.inputs.inputs1, function (value) {
				scope.items.push({listValue: value.listValue});
			});

			if (scope.inputs.hasOwnProperty("inputs2")) {
				$.merge(scope.items, scope.inputs.inputs2);
			}

			if (scope.inputs.hasOwnProperty("inputs3")) {
				$.merge(scope.items, scope.inputs.inputs3);
			}
			
			if (scope.randomItems) {
				scope.items = scope.shuffleArray(scope.items);
			}

			// watch if the activity is finished
			scope.$watch('complete', function(complete) {
				if (complete) {
					if (scope.rightAnswers >= scope.minRightAnswers) {
						// éxito
						scope.success = true;

						// Activamos la siguiente actividad o ruta
						scope.$root.isNextEnabled = true;
					} else {
						// fracaso
						scope.failure = true;
					}
				} 
			});

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;

			var counter = 0
			var chances = scope.options.chancesPerItem-1

			scope.verify = function (item, inputs, num) {
				scope.actualValue = item.input;
				if ((scope.actualValue == null ) || (scope.actualValue === "" )) return;
				scope.exist = false;

				angular.forEach(inputs, function (value, key) {
					if (angular.equals(angular.lowercase(value.listValue), angular.lowercase(scope.actualValue))) {
						scope.exist = true;
					}
				});

				// Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
				if(scope.exist){
					scope.rightAnswers++;
					item.wrong = false;
					item.right = true;
					item.block = true; // marcamos el item como completo, para desactivar el input
					counter++;
				} else {
					
					item.wrong ? chances=scope.options.chancesPerItem-2: chances=scope.options.chancesPerItem-1;

                	item.wrong = true;

                    	if(chances === 0){
                    		angular.forEach(scope.inputs, function (obj, key) {
								angular.forEach(obj, function (o, k) {
									if (o.listValue.toLowerCase() === item.input.toLowerCase()) {
										var n = obj.indexOf(o);
										obj.splice(n, 1);
									}
								});
							});

							for (var i = 0; i < scope.items.length; i++) {
								if (scope.items[i].listValue.toLowerCase() === item.input.toLowerCase()) {
									scope.items[i].listValue = "<span style='color:#F00'>" + item.input +"</span>";
									break;
								}
							}
                    	item.block = true;
                    	counter++;
                    	chances=scope.options.chancesPerItem-1;
                    	}else{chances--;item.input="";}
				}

				if(counter === scope.items.length){
                    	
                    scope.complete = true;
                	
                }
			}
 		}
 	};
 });
/**
 * La actividad permite completar inputs en un table de acuerdo a 
 * el texto que se hubican en la primera columna.
 */
var lizCompleteTableWithText = angular.module('lizCompleteTableWithText', []);

 lizCompleteTableWithText.directive('completeTableWithText', function () {
 	return {
 		restrict: 'E',
 		templateUrl: '../views/activities/complete_table_with_text.html',
 		scope: {
 			options: '=',
 			instruction: '@',
 			title: '@',
 			description: '@',
 			audio: '@'
 		},
 		link: function (scope, iElement, iAttrs) {
 			// Inputs procesados
			scope.words = [];

			// Procesamos cada elemento del array entrante
			angular.forEach(scope.inputs, function (input) {
				scope.words.push({ word: input, right: false, wrong: false });
			});

			scope.getNumber = function(num) {
			    return new Array(num);   
			};

			scope.textMainTitle = scope.options.textMainTitle;
			scope.textInput1Title = scope.options.textInput1Title;
			scope.textInput2Title = scope.options.textInput2Title;
			scope.textInput3Title = scope.options.textInput3Title;
			scope.isPrefix = scope.options.isPrefix || false;
			scope.hasOptions = scope.options.hasOptions || false;
			scope.noTitle = scope.options.noTitle || false;
			scope.rightAnswers = 0;
			scope.complete = false; // Cuando termina la actividad
			scope.block = false;
			scope.success = false;
			scope.failure = false;

			if (scope.hasOptions) {
				scope.opts = scope.options.opts;
			}

			// watch if the activity is finished
			scope.$watch('complete', function(complete) {
				if (complete) {
					if (scope.rightAnswers >= scope.options.minRightAnswers) {
						// éxito
						scope.success = true;

						// Activamos la siguiente actividad o ruta
						scope.$root.isNextEnabled = true;
					} else {
						// fracaso
						scope.failure = true;
					}
				} 
			});

			scope.items = scope.options.data;

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;

			var counter = 0
			var chances = scope.options.chancesPerItem-1

			scope.verify = function (item, items, type) {
				if ((item.input == null ) || (item.input == "" )) return;
				scope.exist = false;

				switch (type) {
					case 1:
							if (item.input.toLowerCase() === items[0].option.toLowerCase()) {
								scope.exist = true;
							} else if (chances === 0) {
								item.input = items[0].option;
							}
						break;

					case 2:
							var match = 0;
							var itemArray = item.input.split(", ");
							console.log(itemArray);
							angular.forEach(itemArray, function (i, k) {
								angular.forEach(items, function (value, key) {
									if (angular.equals(angular.lowercase(value.option), angular.lowercase(i))) {
										match++;
									}
								});
							});

							if (items.length === match) {
								scope.exist = true;
							}
						break;

					case 3 :
							angular.forEach(items, function (value, key) {
								if (angular.equals(angular.lowercase(value.option), angular.lowercase(item.input))) {
									scope.exist = true;
								}
							});
						break;
				}
				// Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
				if(scope.exist){
					scope.rightAnswers++;
					item.wrong = false;
					item.right = true;
					item.block = true; // marcamos el item como completo, para desactivar el input
					counter++;
				} else {
					
					item.wrong ? chances=scope.options.chancesPerItem-2: chances=scope.options.chancesPerItem-1;

                	item.wrong = true;
                	

                    	if(chances === 0){
                    	item.block = true;
                    	counter++;
                    	chances=scope.options.chancesPerItem-1;
                    	}else{chances--;item.input="";}
				}

				if(counter === (scope.options.numOptions)){

                    // 08 08 2014 - Maria Giraldo, Se cambia  scope.complete = false; por  scope.complete = true;para activar la actividad completa al ingresar todas las opciones
                    scope.complete = true;
                    //scope.complete = false;
                	
                }
			}
 		}
 	};
 });
/**
 * La actividad permite responder a varias preguntas en cuadros de texto. 
 */

var lizCompleteTextBoxes = angular.module('lizCompleteTextBoxes', []);

lizCompleteTextBoxes.directive('completeTextBoxes', function($sce){
	// Runs during compile
	return {
		// name: '',
		// priority: 1,
		// terminal: true,
		scope: {
			options: '=',
 			instruction: '@',
 			title: '@',
 			description: '@',
 			src: '@',
 			alt: '@',
 			audio: '@'
		}, // {} = isolate, true = child, false/undefined = no change
		// controller: function($scope, $element, $attrs, $transclude) {},
		// require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
		restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
		// template: '',
		templateUrl: '../views/activities/complete_text_boxes.html',
		// replace: true,
		// transclude: true,
		// compile: function(tElement, tAttrs, function transclude(function(scope, cloneLinkingFn){ return function linking(scope, elm, attrs){}})),
		link: function(scope, iElm, iAttrs, controller) {
			
			scope.rightAnswers = 0;
			scope.complete = false; // Cuando termina la actividad
			scope.block = false;
			scope.success = false;
			scope.failure = false;
			scope.minChars = (scope.options.minChars) ? scope.options.minChars : 5;
			scope.hasImage = (scope.options.hasImage) ? true : false;

			scope.items = scope.options.items;

			// watch if the activity is finished
			scope.$watch('complete', function(complete) {
				if (complete) {
					if (scope.rightAnswers >= scope.options.minRightAnswers || scope.rightAnswers >= scope.items.length) {
						// éxito
						scope.success = true;

						// Activamos la siguiente actividad o ruta
						scope.$root.isNextEnabled = true;
					} else {
						// fracaso
						scope.failure = true;
					}
				} 
			});

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;

			var counter = 0;
			var chances = scope.options.chancesPerItem-1;

			// Para usar el html en angular
			scope.sanitize = function (item) {
				return $sce.trustAsHtml(item);
			}

			scope.compareArray = function (arrayA, arrayB) {
				if (arrayA.length != arrayB.length) { return false; }
		        // sort modifies original array
		        // (which are passed by reference to our method!)
		        // so clone the arrays before sorting
		        var a = jQuery.extend(true, [], arrayA);
		        var b = jQuery.extend(true, [], arrayB);
		        a.sort(); 
		        b.sort();
		        for (var i = 0, l = a.length; i < l; i++) {
		            if (a[i] !== b[i]) { 
		                return false;
		            }
		        }
		        return true;
			};

			scope.verify = function (item) {
				if ((item.input == null ) || (item.input === "" )) return;

				var done = false;
				
				if (item.hasAnswers) {
					var string = item.input.toLowerCase();
					for (var i = 0; i < item.answers.length; i++) {
						if (string.indexOf(item.answers[i].toLowerCase()) === -1)  {
							done = false;
							break;
						}
						done = true;
					};
				} else {
					var letters = /^[A-Za-z\s]+$/;
					done = (item.input.match(letters) && item.input.length >= scope.minChars) ? true : false;
				}


				if (done) {
					scope.rightAnswers++;
					item.wrong = false;
					item.right = true;
					item.block = true; // marcamos el item como completo, para desactivar el input
					counter++;
				} else {
					item.wrong ? chances=scope.options.chancesPerItem-2: chances=scope.options.chancesPerItem-1;

                	item.wrong = true;
                	

                    	if(chances === 0){
                    	item.block = true;
                    	counter++;
                    	chances=scope.options.chancesPerItem-1;
                    	}else{chances--;item.input="";}
				}

				if(counter === scope.items.length){
                    	
                    scope.complete = true;
                	
                }
                
			};
		}
	};
});
var lizCompleteWords = angular.module('lizCompleteWords', []);

lizCompleteWords.directive('completeWords', function () {
  return {
    restrict: 'E',
    templateUrl: '../views/activities/complete_words.html',
    scope: {
      options: '=',
      description: '@',
      audio: '@'
    },
    link: function (scope, element, attrs) {
      var opt = scope.options,
        minRightAnswers = opt.minRightAnswers,
        rightAnswers = 0, // Contador de preguntas buenas
        chances = 0; // el doble, ya que es izquierda y derecha

      // Corremos la aplicación
      scope.items = opt.items;
      scope.itemsPerRow = opt.itemsPerRow;
      scope.pattern = scope.items[0].pattern;
      scope.words = [];
      scope.success = false;
      scope.failure = false;
      scope.block = false;
      scope.samples = opt.samples; // ejemplos para llenar los cuadros

      chances = scope.items[0].pattern.length * 1; // el doble, ya que es izquierda y derecha

      /**
       * Devuelve los estilos del texto.
       */
      scope.getTextStyles = function () {
        var styles = "";

        if(! scope.items[0].resource) {
          styles = "margin-left: 0; width: 100%;";
        }

        return styles;
      };

      /**
       * Para obtener los estilos de los elementos, específicamente el ancho
       */
      scope.getStyles = function () {
        var styles = "";

        if (scope.itemsPerRow) {
          styles += "width: " + (100 / scope.itemsPerRow) + "%;";
          styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
          styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
          styles += "margin-right: " + (10 / scope.itemsPerRow) + "%!important;";
        } else {
          styles += "width: " + (100 / scope.items.length) + "%;";
          styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
          styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
        }

        return styles;
      };

      var string = scope.items[0].text;
      var words = string.split(" ");

      // Constructor de palabras
      for (var i = 0; i < words.length; i++) {

        if (scope.pattern.indexOf(i) > -1) {
          scope.words.push({
            isInput: true,
            input: '',
            word: (words[i])
          });
        }  else {
          scope.words.push({
            isInput: false,
            word: (words[i])
          });
        }

      }

      /**
       * Verifica si el input cumple con las condiciones del número
       */
      var chancesPerItem = 1;

      scope.verify = function (item) {
        if (item.input === '') return;

        // Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
        if (item.input === item.word || ((scope.items[0].hasOwnProperty('answer2')) && (item.input === scope.items[0].answer2))) {
          rightAnswers++;
          chances--;
          item.wrong = false;
          item.right = true;
          item.completed = true; // marcamos el item como completo, para desactivar el input
        } else {

          item.wrong ? chancesPerItem = 0 : chancesPerItem = 1;
          item.wrong = true;

          if (chancesPerItem === 0) {
            item.completed = true;
            chances--;
            chancesPerItem = 1;
          } else {
            item.input = "";
          }
        }

        // fin de la actividad
        if (chances === 0) {
          if (rightAnswers >= minRightAnswers) {
            scope.$root.isNextEnabled = true;
            scope.success = true;
          } else {
            scope.failure = true;
          }
        }

      }; // verify()
    }
  };
});


/**
 * La actividad permite completar palabras de uno o varios textos.
 * por medio de selects.
 */

var lizCompleteWordsSelect = /**
 * lizCompleteWordsSelect Module
 */
  angular.module('lizCompleteWordsSelect', []);

lizCompleteWordsSelect.directive('completeWordsSelect', function ($log) {
  // Runs during compile
  return {
    // name: '',
    // priority: 1,
    // terminal: true,
    scope: {
      options: '=',
      instruction: '@',
      title: '@',
      description: '@',
      audio: '@'
    }, // {} = isolate, true = child, false/undefined = no change
    // controller: function($scope, $element, $attrs, $transclude) {},
    // require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
    restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
    // template: '',
    templateUrl: '../views/activities/complete_words_select.html',
    // replace: true,
    // transclude: true,
    // compile: function(tElement, tAttrs, function transclude(function(scope, cloneLinkingFn){ return function linking(scope, elm, attrs){}})),
    link: function (scope, iElm, iAttrs, controller) {
      scope.items = scope.options.items;
      scope.itemsPerRow = scope.options.itemsPerRow;
      var minRightAnswers = scope.options.minRightAnswers,
        chances = scope.options.chancesPerItem - 1;
      scope.inputsCounter = 0;
      scope.rightAnswers = 0;
      scope.complete = false;
      scope.success = false;
      scope.failure = false;
      scope.block = false;

      // watch if the activity is finished
      scope.$watch('complete', function (complete) {
        if (complete) {
          if (scope.rightAnswers >= minRightAnswers) {
            // success
            scope.success = true;

            // Turn on next route
            scope.$root.isNextEnabled = true;
          } else {
            // failure
            scope.failure = true;
          }
        }
      });

      angular.forEach(scope.items, function (item, key) {

        angular.forEach(item.answers, function (value, key) {
          item.text = item.text.replace(value.answer, "inputhere");
        });

        item.words = [];

        var words = item.text.split(" ");

        // Constructor de palabras
        for (var i = 0; i < words.length; i++) {
          if (item.pattern.indexOf(i) > -1) {
            scope.inputsCounter++;
            item.words.push({
              isInput: true,
              input: '',
              word: item.answers[i].answer,
              index: i,
              options: item.answers[i].options
            });
          } else {
            item.words.push({
              isInput: false,
              word: (words[i])
            });
          }
        }
      });

      var counter = 0;
      scope.verify = function (item) {
        $log.log(item);
        if (item.input === '') return;

        // Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
        if (item.input.toLowerCase() === item.word.toLowerCase()) {
          scope.rightAnswers++;
          item.wrong = false;
          item.right = true;
          item.completed = true; // marcamos el item como completo, para desactivar el input
          counter++;
        } else {
          item.wrong ? chances = scope.options.chancesPerItem - 2 : chances = scope.options.chancesPerItem - 1;

          item.wrong = true;

          if (chances === 0) {
            item.completed = true;
            counter++;
            chances = scope.options.chancesPerItem - 1;
            item.input = item.word;
          } else {
            chances--;
            item.input = "";
          }
        }

        if (counter === scope.inputsCounter) {
          scope.complete = true;
        }

      };
    }
  };
});
var lizCompleteWordsWi = angular.module('lizCompleteWordsWi', []);

lizCompleteWordsWi.directive('completeWordsWi', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/complete_words_wi.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.pattern = scope.items[0].pattern;
			scope.words = [];
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.items[0].pattern.length * 1, // el doble, ya que es izquierda y derecha
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow){
					styles += "width: " + (100 / scope.itemsPerRow) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-right: " + (10 / scope.itemsPerRow) + "%!important;";
				} else {
					styles += "width: " + (100 / scope.items.length) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
				}
				
				return styles;

				
			};

			var string = scope.items[0].text;
			var words = string.split(" ");
			

				   console.log(words);
				   /*console.log(scope.pattern);*/

		   // Constructor de palabras
			for(var i=0; i < words.length; i++){

				if( scope.pattern.indexOf(i) > -1 ){
					scope.words.push({
							  isInput: true,
						      input: (words[i]).substring(0,1),
						      word: (words[i])
					});

				} 

				else{
					scope.words.push({
							 isInput: false,
						     word: (words[i])
					});
				}

			}

			/**
			 * Verifica si el input cumple con las condiciones del número 
			 */
			 var chancesPerItem = 1

			scope.verify = function (item) {
				if(item.input === '') return; 

				// Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
					if(item.input === item.word){
						rightAnswers++;
						chances--;
						item.wrong = false;
						item.right = true;
						item.completed = true; // marcamos el item como completo, para desactivar el input
					} else {
						
						item.wrong ? chancesPerItem = 0: chancesPerItem = 1;
						item.wrong = true;
						
								if(chancesPerItem === 0){
		                    	item.completed = true;
		                    	chances--;
		                    	chancesPerItem = 1;
		                    	}else{item.input="";}
					}

					
					

					// fin de la actividad
					if(chances === 0){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} 
					
			}; // verify()



		}


    }; 
});


var lizCountElements = angular.module('lizCountElements', []);

// Knockout Pairs Factory
lizCountElements.factory('countElementsActivity', function ($rootScope, shuffleArrayFactory) {

	var countElementsActivity = {};

	/**
	 * Crea el ViewModel
	 */
	countElementsActivity.create = function (options) {
		return new countElementsActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		options						Opciones a utilizar.
	 *
	 * @param {integer}		options.chances							Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		options.minRightAnswers			Número mínimo de respuestas correctas
	 * @param {function}	options.successCallback			Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	options.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 *
	 */
	countElementsActivity._ViewModel = function (options) {
		var self = this;

		var minRightAnswers = options.minRightAnswers ? options.minRightAnswers : options.items.length,
			chances = options.chances ? options.chances : options.items.length;

		// antes que nada, generamos el Id para cada uno de los elementos
		options.items.forEach(function(item){
			item._id = (Math.random() + 1).toString(36).substring(7);
		});

		self.targets = ko.observableArray(options.items.slice(0)); // Clonamos el array
		self.numbers = ko.observableArray(shuffleArrayFactory.run(options.items)); // Elementos desordenados

		self.targets().forEach(function(target){
			// Debemos agregar una propiedad a cada target para manejar el sortable
			target._sortable = ko.observableArray();
			target._sortable._id = target._id; // Para compararlo usando knockoutSortable

			// Fuera de eso, agregaremos un array con un tamaño igual a número, para así multiplicar las imágenes
			target._multiplier = [];

			for(var i = 0; i < target.number; i++){
				target._multiplier.push(i + 1);
			}

		});

		// Carpeta de recursos desde angular
		self.resources = $rootScope.resources;

		self.maximumElements = 1; // IMPORTANTE: Requerido para que los sortables no acepten más de un elemento
		self.rightAnswers = 0; // Inicializamos el número de respuestas buenas a 0

		// Triggers que se activan cuando la respuesta es correcta/incorrecta
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
		self.failure = ko.observable(false);
		self.success = ko.observable(false);

		// Define si el target esta lleno utilizando self.maximumElements
		self.isContainerFull = function (parent) {
			return parent().length < self.maximumElements;
		};

		// Función que se ejecuta cuando se suelta el elemento y hace toda la funcionalidad
		self.verifyAnswer = function (arg) {
			var item = arg.item,
				parent = arg.targetParent;

			if(arg.sourceParent === parent) return;

			if(item._id === parent._id){
				// Respuesta Correcta
				self.rightAnswer(item);
				self.rightAnswers++;
			} else {
				// Respuesta Incorrecta
				self.wrongAnswer(item);
				arg.cancelDrop = true;
			}

			chances--;

			if(chances === 0){
				if (self.rightAnswers >= minRightAnswers) {

					self.success(true); // Trigger de éxito
					$rootScope.isNextEnabled = true; // Activamos el siguiente

					// Se llama la función de éxito, definida por el desarrollador
					if (typeof options.successCallback !== "undefined") options.successCallback();

				} else {
					// Trigger de fracaso
					self.failure(true);
				}
				
			} 
		};

	};

	/**
	 * Inicializa la instancia del ViewModel creado con countElementsActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	countElementsActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return countElementsActivity;

});


lizCountElements.directive('countElements', function  (countElementsActivity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			description: '@'
		},
		templateUrl: '../views/activities/count_elements.html',
		link: function postLink(scope, element, attrs) {
			// Corremos la aplicación
			countElementsActivity.run(countElementsActivity.create(scope.options));
		}
	}; 
});

var lizCountElements2 = angular.module('lizCountElements2', ['factories']);

lizCountElements2.directive('countElements2', function  (shuffleArrayFactory) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			hideImages: '@',
			description: '@'
		},
		templateUrl: '../views/activities/count_elements2.html',
		link: function postLink(scope, element, attrs) {

			var opt = scope.options;

			// La diversión empieza aquí!!!
			scope.items = opt.items;
			scope.rightAnswers = 0; // Contador de preguntas correctas

			/**
			 * Función que corre que cuando cambia el valor de un input
			 */
			scope.verifyInput = function (item) {

				// Si no es un número, borramos el input
				if(isNaN(parseInt(item.input))){
					item.input = '';
				}

				// Recorremos todos los elementos. Si se han llenado los inputs mínimos requeridos, activamos el botón de siguiente
				var count = 0;

				count = scope.items.filter(function(item){
					return item.hasOwnProperty('input') && item.input !== '';
				}).length;

				if(count >= opt.minRightAnswers){
					scope.$root.isNextEnabled = true;
				} else {
					scope.$root.isNextEnabled = false;
				}


			}

			scope.$root.beforeGoNext = function () {
				scope.success = true; // Mostramos la vista de felicitación
				return true; // nos permite pasar a la siguiente actividad
			};

		}
	}; 
});


var lizCrossword = angular.module('lizCrossword', []);

lizCrossword.directive('crossword', function () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			audio:'@',
			description: '@'
		},
		templateUrl: '../views/activities/crossword.html',
		link: function (scope, element, attrs) {
			var opt = scope.options; // Alias de opciones

			// Número de columnas y filas en la tabla
			var cols = 0,
				rows = 0,
				start = 0, // punto inicial usado en words.foreach
				end = 0, // punto final usado en words.foreach
				filtered = null; // Filtrado de palabras

			scope.table = []; // Tabla de trabajo
			scope.words = opt.words; // Tomamos las palabras desde el controlador
			scope.selectedWord = false; // palabra seleccionada actualmente
			scope.selectedCell = false; // palabra seleccionada actualmente
			scope.prevParent = false; // padre anterior. Usado para las palabras cruzadas en el salto de celda

			// calificaciones
			scope.success = false;
			scope.failure = false;

			// ===================================================
			// CONSTRUCCIÓN DE PALABRAS
			// ===================================================
			// Recorremos las palabras para obtener la configuración.
			// Inicialmente, se busca el tamaño del crucigrama
			scope.words.forEach(function (word) {

				// Convertimos las palabras a mayúsculas
				word.word = word.word.toUpperCase();

				// columnas
				if(word.pos[0][0] > cols) cols = word.pos[0][0];
				if(word.pos[1][0] > cols) cols = word.pos[1][0];

				// filas
				if(word.pos[0][1] > rows) rows = word.pos[0][1];
				if(word.pos[1][1] > rows) rows = word.pos[1][1];

				// Creamos el objeto de palabra
				if(word.pos[0][1] === word.pos[1][1]){
					// horizontal
					word.horizontal = true;
					word._word = [];

					// si x en cada posición es igual, es horizontal
					for(var i = word.pos[0][0]; i <= word.pos[1][0]; i++){
						var item = {
							x: i,
							y: word.pos[0][1],
							$parent: word,
							letter: word.word[i - word.pos[0][0]] // añade la letra de la palabra
						};

						// si es la letra inicial, añadimos el número
						if(i === word.pos[0][0]) item.number = word.number;
						word._word.push(item);
					}

				} else if(word.pos[0][0] === word.pos[1][0]){
					// vertical
					word.vertical = true;
					word._word = [];

					// antes que nada, debemos ver desde donde empieza la palabra
					if(word.pos[0][1] < word.pos[1][1]) {
						// de arriba a abajo
						// si y en cada posición es igual, entonces es vertical
						for(var i = word.pos[0][1]; i <= word.pos[1][1]; i++){
							var item = {
								x: word.pos[0][0],
								y: i,
								$parent: word,
								letter: word.word[i - word.pos[0][1]]
							};

							// si es la letra inicial, añadimos el número
							if(i === word.pos[0][1]) item.number = word.number;
							word._word.push(item);
						}
					} else if(word.pos[0][1] > word.pos[1][1]) {
						// De abajo a arriba
						// Reversa la palabra
						word.word = word.word.split("").reverse().join("");
						word.reverse = true; // propiedad para definir que la palabra vertical viene invertida

						for(var i = word.pos[1][1]; i <= word.pos[0][1]; i++){
							var item = {
								x: word.pos[0][0],
								y: i,
								$parent: word,
								letter: word.word[i - word.pos[1][1]]
							};

							// si es la letra inicial, añadimos el número
							if(i === word.pos[0][1]) item.number = word.number;
							word._word.push(item);
						}
					}
				}
			});


			// ===================================================
			// CONSTRUCCIÓN DE TABLA
			// ===================================================
			var temp = null, // Variable temporal
				number = null;

			for(var y = 0; y <= rows; y++){
				// Añadimos una nueva fila
				scope.table.push([]);

				// para cada celda
				for(var x = 0; x <= cols; x++){
					// Buscamos la palabra que coincide con (x,y)
					filtered = scope.words.filter(function (w) {
						return ((w.pos[0][0] <= x && w.pos[1][0] >= x)
							&& (w.pos[0][1] <= y && w.pos[1][1] >= y)) ||
								((w.pos[1][0] <= x && w.pos[0][0] >= x)
							&& (w.pos[1][1] <= y && w.pos[0][1] >= y));
					});

					// Agrega el nuevo objeto en la tabla
					if(filtered.length > 0){
						// Recuperamos la celda idéntica desde las palabras
						temp = filtered[0]._word.filter(function (w) { 
							return w.x === x && w.y === y;
						})[0];

						// Añadimos el modelo a vincular con cada uno de los inputs
						temp.$parent._word.forEach(function (letter) { letter.input = ''; });

						// Para las celdas que se cruzan, debemos hacer una funcionalidad especial
						if(filtered.length > 1){
							temp.cross = true;
						}

					} else {
						// Si no, es un cuadro vacío
						temp = {
							x: x,
							y: y,
							empty: true
						};
					}

					// Añade el objeto
					scope.table[y].push(temp);
				}
			}


			// Añadimos los números a las palabras que empiezan dentro de otra palabra
			var iX = 0,
				iY = 0;

			scope.words.forEach(function(word){
				iX = word.pos[0][0];
				iY = word.pos[0][1];

				// si no tiene número, se agrega
				if(! scope.table[iY][iX].hasOwnProperty('number')) {
					scope.table[iY][iX].number = word.number;
				}
			});


			/**
			 * Selecciona la palabra y la celda, para que el estudiante pueda empezar a
			 * escribir la palabra
			 *
			 * @param {Object} item celda seleccionada en el crucigrama
			 */
			scope.selectWord = function (item) {
				// si no es parte de una palabra, cancelamos inmediatamente
				if(item.empty) return;

				// si existe una palabra seleccionada previamente, limpiamos activated
				if(scope.selectedWord){
					scope.selectedWord._word.forEach(function (letter) {
						delete scope.table[letter.y][letter.x].actived;
					});
				} 

				// se limpia la celda
				if(scope.selectedCell){
					delete scope.selectedCell.mainCell;
				}

				// Actualizamos la palabra y la celda seleccionada
				scope.prevParent = scope.selectedCell.$parent;
				scope.selectedWord = item.$parent;
				scope.selectedCell = item;

				// Buscamos la celda, para enfocarse en el input
				element.find('.c' + item.x + '.r' + item.y + ' input').focus();

				// Marcamos la palabra y la celda para que se vean activas
				scope.selectedCell.mainCell = true;
				item.$parent._word.forEach(function (letter) { scope.table[letter.y][letter.x].actived = true; });
			}; // selectWord()


			/**
			 * Función que se dispara al escribir en los inputs. Permite el cambio de celda
			 * al escribir
			 */
			scope.changeCell = function () {
				// Se debe haber seleccionado una celda
				if(!scope.selectedCell) return;

				var cell = scope.selectedCell, // alias
					next = false, // siguiente celda
					parent = cell.$parent;

				// si el input no tiene nada, volvemos.
				if(cell.input === '') return; 

				// Cambia a mayúsculas
				cell.input = cell.input.toUpperCase();

				// solo letras. No espacios
				if(! cell.input.match("^[A-ZÑ]+$")){
					cell.input = cell.input.slice(0, -1);
					return;
				}

				// si tiene más de una letra, se borra todo y se deja siempre la última letra
				if(cell.input.length > 1){ cell.input = cell.input[ cell.input.length - 1 ]; }

				// Celdas cruzadas
				if(cell.cross){
					// Si la celda es cruzada y el padre es igual al padre anterior, es necesario
					// buscar al otro padre y actualizar la misma celda
					if(parent === scope.prevParent){
						var cells = null,
							otherCell = null;

						// El otro padre. Usando filtros anidados
						var otherParent = scope.words.filter(function(word){
							cells = word._word.filter(function(letter){
								return letter.x === cell.x && letter.y === cell.y;
							});

							return cells.length && word !== parent;
						})[0];

						// Buscamos la celda y la actualizamos
						otherCell = otherParent._word.filter(function (letter) {
							return letter.x === cell.x && letter.y === cell.y;
						})[0];

						otherCell.input = cell.input;
					} else {
						parent = scope.prevParent;
					}

					// debemos buscar la otra celda cruzada y actualizar su input
					var crossCell = parent._word.filter(function (letter) {
						return letter.x === cell.x && letter.y === cell.y;
					})[0];

					// Actualizamos el input
					if(crossCell) crossCell.input = cell.input;
				}

				// ===================================================
				// Próxima celda en base a la actual
				// ===================================================
				// Miramos cual será la siguiente celda
				if(parent.horizontal){
					next = scope.table[cell.y][cell.x + 1];
				}

				if(parent.vertical){
					// de arriba a abajo
					if(parent.pos[0][1] < parent.pos[1][1]) next = scope.table[cell.y + 1] ? scope.table[cell.y + 1][cell.x] : false;
					// de abajo a arriba
					if(parent.pos[0][1] > parent.pos[1][1]) next = scope.table[cell.y - 1] ? scope.table[cell.y - 1][cell.x] : false;
				}

				// Si la próxima celda no esta vacía
				if(!next || next.hasOwnProperty('empty')){
					// si es vertical de arriba a abajo
					if(parent.vertical && parent.pos[0][1] > parent.pos[1][1]){
						// último elemento, ya que va al revés
						next = scope.table[ parent._word[parent._word.length - 1].y ][ parent._word[parent._word.length - 1].x ];
					} else {
						next = scope.table[ parent._word[0].y ][ parent._word[0].x ];
					}
				}
					
				// Cambia de celda a la siguiente
				scope.selectWord(next);
			}; // changeCell()


			/**
			 * Verifica si el crucigrama es correcto o no
			 */
			scope.verify = function () {
				// Contadores 
				var total = 0,
					rightAnswers = 0;

				// Empezamos a recorrer todas las palabras y sumando
				scope.words.forEach(function(word){
					// Total de letras
					total += word._word.length; 

					// Contamos las letras correctas
					rightAnswers += word._word.filter(function(letter){
						return letter.input === letter.letter;
					}).length;
				});

				if (total === rightAnswers) {
				  scope.success = true;
				  scope.$root.isNextEnabled = true;
				}
				else {
				  scope.failure = true;
				}
				
			}

			// ============================================================================
			// IMPORTANTE!!!! IMPIDE EL USO DE LA BARRA ESPACIADORA EN EL CRUCIGRAMA
			// ============================================================================
			element.bind("keyup keypress keydown", function (e) {
				if(e.keyCode === 32){
					e.preventDefault();
				}
			});



		}
	}; 
});

var lizCrosswordWithLetter = angular.module('lizCrosswordWithLetter', []);

lizCrosswordWithLetter.directive('crosswordWithLetter', function () {
    return {
        restrict: 'E',
        scope: {
            options: '=',
            audio:'@',
            description: '@'
        },
        templateUrl: '../views/activities/crossword_with_letter.html',
        link: function (scope, element, attrs) {
            var opt = scope.options; // Alias de opciones

            // Número de columnas y filas en la tabla
            var cols = 0,
                rows = 0,
                start = 0, // punto inicial usado en words.foreach
                end = 0, // punto final usado en words.foreach
                filtered = null; // Filtrado de palabras

            scope.table = []; // Tabla de trabajo
            scope.words = opt.words; // Tomamos las palabras desde el controlador
            scope.selectedWord = false; // palabra seleccionada actualmente
            scope.selectedCell = false; // palabra seleccionada actualmente
            scope.prevParent = false; // padre anterior. Usado para las palabras cruzadas en el salto de celda

            // calificaciones
            scope.success = false;
            scope.failure = false;

            // ===================================================
            // CONSTRUCCIÓN DE PALABRAS
            // ===================================================
            // Recorremos las palabras para obtener la configuración.
            // Inicialmente, se busca el tamaño del crucigrama
            scope.words.forEach(function (word) {
                // Convertimos las palabras a mayúsculas
                word.word = word.word.toUpperCase();

                // columnas
                if(word.pos[0][0] > cols) cols = word.pos[0][0];
                if(word.pos[1][0] > cols) cols = word.pos[1][0];

                // filas
                if(word.pos[0][1] > rows) rows = word.pos[0][1];
                if(word.pos[1][1] > rows) rows = word.pos[1][1];

                // Creamos el objeto de palabra
                if(word.pos[0][1] === word.pos[1][1]){
                    // horizontal
                    word.horizontal = true;
                    word._word = []

                    // si x en cada posición es igual, es horizontal
                    for(var i = word.pos[0][0]; i <= word.pos[1][0]; i++){
                        var item = {
                            x: i,
                            y: word.pos[0][1],
                            $parent: word,
                            letter: word.word[i - word.pos[0][0]], // añade la letra de la palabra
                            init_letter: word.init_letter[i - word.pos[0][0]] // añade la letra de la palabra
                        };

                        // si es la letra inicial, añadimos el número
                        if(i === word.pos[0][0]) item.number = word.number;
                        word._word.push(item);
                    }

                } else if(word.pos[0][0] === word.pos[1][0]){
                    // vertical
                    word.vertical = true;
                    word._word = [];

                    // antes que nada, debemos ver desde donde empieza la palabra
                    if(word.pos[0][1] < word.pos[1][1]) {
                        // de arriba a abajo
                        // si y en cada posición es igual, entonces es vertical
                        for(var i = word.pos[0][1]; i <= word.pos[1][1]; i++){
                            var item = {
                                x: word.pos[0][0],
                                y: i,
                                $parent: word,
                                letter: word.word[i - word.pos[0][1]],
                                init_letter:  word.init_letter[i - word.pos[0][1]]
                            };

                            // si es la letra inicial, añadimos el número
                            if(i === word.pos[0][1]) item.number = word.number;
                            word._word.push(item);
                        }
                    } else if(word.pos[0][1] > word.pos[1][1]) {
                        // De abajo a arriba
                        // Reversa la palabra
                        word.word = word.word.split("").reverse().join("");
                        word.reverse = true; // propiedad para definir que la palabra vertical viene invertida

                        for(var i = word.pos[1][1]; i <= word.pos[0][1]; i++){
                            var item = {
                                x: word.pos[0][0],
                                y: i,
                                $parent: word,
                                letter: word.word[i - word.pos[1][1]],
                                init_letter: word.init_letter[i - word.pos[1][1]]
                            };

                            // si es la letra inicial, añadimos el número
                            if(i === word.pos[0][1]) item.number = word.number;
                            word._word.push(item);
                        }
                    }
                }
            });


            // ===================================================
            // CONSTRUCCIÓN DE TABLA
            // ===================================================
            var temp = null, // Variable temporal
                number = null;

            for(var y = 0; y <= rows; y++){
                // Añadimos una nueva fila
                scope.table.push([]);

                // para cada celda
                for(var x = 0; x <= cols; x++){
                    // Buscamos la palabra que coincide con (x,y)
                    filtered = scope.words.filter(function (w) {
                        return ((w.pos[0][0] <= x && w.pos[1][0] >= x)
                        && (w.pos[0][1] <= y && w.pos[1][1] >= y)) ||
                        ((w.pos[1][0] <= x && w.pos[0][0] >= x)
                        && (w.pos[1][1] <= y && w.pos[0][1] >= y));
                    });

                    // Agrega el nuevo objeto en la tabla
                    if(filtered.length > 0){
                        // Recuperamos la celda idéntica desde las palabras
                        temp = filtered[0]._word.filter(function (w) {
                            return w.x === x && w.y === y;
                        })[0];

                        // Añadimos el modelo a vincular con cada uno de los inputs
                        temp.$parent._word.forEach(function (letter) { letter.input = ''; });

                        // Para las celdas que se cruzan, debemos hacer una funcionalidad especial
                        if(filtered.length > 1){
                            temp.cross = true;
                        }

                    } else {
                        // Si no, es un cuadro vacío
                        temp = {
                            x: x,
                            y: y,
                            empty: true
                        };
                    }

                    // Añade el objeto
                    scope.table[y].push(temp);
                }
            }


            // Añadimos los números a las palabras que empiezan dentro de otra palabra
            var iX = 0,
                iY = 0;

            scope.words.forEach(function(word){
                iX = word.pos[0][0];
                iY = word.pos[0][1];

                // si no tiene número, se agrega
                if(! scope.table[iY][iX].hasOwnProperty('number')) {
                    scope.table[iY][iX].number = word.number;
                }
            });


            /**
             * Selecciona la palabra y la celda, para que el estudiante pueda empezar a
             * escribir la palabra
             *
             * @param {Object} item celda seleccionada en el crucigrama
             */
            scope.selectWord = function (item) {
                // si no es parte de una palabra, cancelamos inmediatamente
                if(item.empty) return;

                // si existe una palabra seleccionada previamente, limpiamos activated
                if(scope.selectedWord){
                    scope.selectedWord._word.forEach(function (letter) {
                        delete scope.table[letter.y][letter.x].actived;
                    });
                }

                // se limpia la celda
                if(scope.selectedCell){
                    delete scope.selectedCell.mainCell;
                }

                // Actualizamos la palabra y la celda seleccionada
                scope.prevParent = scope.selectedCell.$parent;
                scope.selectedWord = item.$parent;
                scope.selectedCell = item;

                // Buscamos la celda, para enfocarse en el input
                element.find('.c' + item.x + '.r' + item.y + ' input').focus();

                // Marcamos la palabra y la celda para que se vean activas
                scope.selectedCell.mainCell = true;
                item.$parent._word.forEach(function (letter) { scope.table[letter.y][letter.x].actived = true; });
            }; // selectWord()


            /**
             * Función que se dispara al escribir en los inputs. Permite el cambio de celda
             * al escribir
             */
            scope.changeCell = function () {
                // Se debe haber seleccionado una celda
                if(!scope.selectedCell) return;

                //08 08 2014 Maria Giraldo -Validar que escriba una sola letra

                var cell = scope.selectedCell, // alias
                    next = false, // siguiente celda
                    parent = cell.$parent;

                /*


                 // si el input no tiene nada, volvemos.
                 if(cell.input === '') return;
                 // solo letras. No espacios
                 if(! cell.input.match("^[A-ZÑ]+$ ")){
                 cell.input = cell.input.slice(0, -1);
                 return;
                 }
                */


                // Cambia a mayúsculas
                cell.input = cell.input.toUpperCase();
               
                // si tiene más de una letra, se borra todo y se deja siempre la última letra
                if(cell.input.length > 1){
                    cell.input = cell.input[ cell.input.length - 1 ];
                }


                // Celdas cruzadas
                if(cell.cross){
                    // Si la celda es cruzada y el padre es igual al padre anterior, es necesario
                    // buscar al otro padre y actualizar la misma celda
                    if(parent === scope.prevParent){
                        var cells = null,
                            otherCell = null;

                        // El otro padre. Usando filtros anidados
                        var otherParent = scope.words.filter(function(word){
                            cells = word._word.filter(function(letter){
                                return letter.x === cell.x && letter.y === cell.y;
                            });

                            return cells.length && word !== parent;
                        })[0];

                        // Buscamos la celda y la actualizamos
                        otherCell = otherParent._word.filter(function (letter) {
                            return letter.x === cell.x && letter.y === cell.y;
                        })[0];

                        otherCell.input = cell.input;
                    } else {
                        parent = scope.prevParent;
                    }

                    // debemos buscar la otra celda cruzada y actualizar su input
                    var crossCell = parent._word.filter(function (letter) {
                        return letter.x === cell.x && letter.y === cell.y;
                    })[0];

                    // Actualizamos el input
                    if(crossCell) crossCell.input = cell.input;
                }

                // ===================================================
                // Próxima celda en base a la actual
                // ===================================================
                // Miramos cual será la siguiente celda
                if(parent.horizontal){
                    next = scope.table[cell.y][cell.x + 1];
                }

                if(parent.vertical){
                    // de arriba a abajo
                    if(parent.pos[0][1] < parent.pos[1][1]) next = scope.table[cell.y + 1] ? scope.table[cell.y + 1][cell.x] : false;
                    // de abajo a arriba
                    if(parent.pos[0][1] > parent.pos[1][1]) next = scope.table[cell.y - 1] ? scope.table[cell.y - 1][cell.x] : false;
                }

                // Si la próxima celda no esta vacía
                if(!next || next.hasOwnProperty('empty')){
                    // si es vertical de arriba a abajo
                    if(parent.vertical && parent.pos[0][1] > parent.pos[1][1]){
                        // último elemento, ya que va al revés
                        next = scope.table[ parent._word[parent._word.length - 1].y ][ parent._word[parent._word.length - 1].x ];
                    } else {
                        next = scope.table[ parent._word[0].y ][ parent._word[0].x ];
                    }
                }
                scope.selectWord(next);
            }; // changeCell()


            /**
             * Verifica si el crucigrama es correcto o no
             */
            scope.verify = function () {
                // Contadores
                var total = 0,
                    rightAnswers = 0;

                // Empezamos a recorrer todas las palabras y sumando
                scope.words.forEach(function(word){
                    // Total de letras
                    total += word._word.length;

                    // Contamos las letras correctas
                    rightAnswers += word._word.filter(function(letter){

                        //08 08 2014 -  Maria Giraldo, se añade validación de letras estáticas
                        if (letter.init_letter != '' && letter.init_letter === letter.letter){
                            return letter.letter === letter.init_letter;
                        }

                       // return letter.input === letter.init_letter;
                        return letter.input === letter.letter;
                    }).length;

                });

                // se resta 1 porque se desborda
                total = total - 1;

                if (total === rightAnswers) {
                    scope.success = true;
                    scope.$root.isNextEnabled = true;
                }
                else {
                    scope.failure = true;
                }
            }


            scope.onClick = function() {
                console.log("click");
                var cell = scope.selectedCell, // alias
                    next = false, // siguiente celda
                    parent = cell.$parent;

                /*
                 // si el input no tiene nada, volvemos.
                 if(cell.input === '') return;
                 // solo letras. No espacios
                 if(! cell.input.match("^[A-ZÑ]+$ ")){
                 cell.input = cell.input.slice(0, -1);
                 return;
                 }
                 */

                // Cambia a mayúsculas
                cell.input = cell.input.toUpperCase();

                console.log("aca ");
                console.log(cell);



            }

            // ============================================================================
            // IMPORTANTE!!!! IMPIDE EL USO DE LA BARRA ESPACIADORA EN EL CRUCIGRAMA
            // ============================================================================
            element.bind("keyup keypress keydown", function (e) {
                if(e.keyCode === 32){
                    e.preventDefault();
                }
            });



        }
    };
});

var lizDifferences = angular.module('lizDifferences', []);

lizDifferences.directive('differences', function  () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			audio: '@',
			description: '@'
		},
		templateUrl: '../views/activities/differences.html',
		link: function postLink(scope, element, attrs) {

			var opt = scope.options,
				pass = false; // Used to evaluate if the inputs are right

			scope.images = opt.images;
			scope.inputs = [];
			scope.passes = false; // Define si la actividad cumple o no

			// Activa el botón de siguiente desde el inicio
			scope.$root.isNextEnabled = true;

			// Constructor de inputs
			for (var i=0; i < opt.inputs; i++) {
				scope.inputs.push({
					input: ''
				});
			}

			scope.$root.beforeGoNext = function () {
				if(pass){
					scope.success = true;
					return true;
				} else {
					scope.failure = true;
					return false;
				}
			}

			/**
			 * Verifica el fin de la actividad
			 */
			scope.verify = function () {
				// Contamos los elementos que cumplen las condiciones
				var matches = scope.inputs.filter(function(item){
					return item.input.toLowerCase().match(/([bcdfghjklmnñpqrstvwxyz])/) &&
						item.input.toLowerCase().match(/([aeiou])/);
				}).length;

				// Comparamos el número con el total de elementos
				if(matches === scope.inputs.length){
					pass = true;
				} else {
					pass = false;
				}
			}


			
		}
	}; 
});

var lizDragDropMark = angular.module('lizDragDropMark', []);

// Knockout Pairs Factory
lizDragDropMark.factory('dragDropMarkActivity', function ($rootScope) {

	var dragDropMarkActivity = {};

	/**
	 * Crea el ViewModel
	 */
	dragDropMarkActivity.create = function (options) {
		return new dragDropMarkActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		options						Opciones a utilizar.
	 * @param {Array}		options.items				Elementos donde se suelta la marca. Deben tener la propiedad bool "answer"
	 * @param {integer}		options.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		options.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {function}	options.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	options.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 *
	 */
	dragDropMarkActivity._ViewModel = function (options) {
		var self = this,
				rightAnswers = 0,
				chances = typeof options.chances !== "undefined" ? options.chances : options.items.length,
				minRightAnswers = options.minRightAnswers,
				maximumElements = 1;

		// ordena el array de forma aleatoria usando el algoritmo de Fisher-Yates
		self.shuffleArray = function(array) {
			for (var i = array.length - 1; i > 0; i--) {
				var j = Math.floor(Math.random() * (i + 1));
				var temp = array[i];
				array[i] = array[j];
				array[j] = temp;
			}
			return array;
		};

		var number = 1
		self.items = ko.observableArray(options.items);

		// Añadimos a cada item un observableArray para que puedan recibir las marcas
		ko.utils.arrayForEach(self.items(), function(item,index){
			item._target = ko.observableArray();
			item._target._id = item.answer; // para poder identificar si esta bueno o malo

			// Propiedades por defecto
			item.resource = item.hasOwnProperty('resource') ? item.resource : false;
			item.alt = item.hasOwnProperty('alt') ? item.alt : '';
			item.text = item.hasOwnProperty('text') ? item.text : false;
			item.question = item.hasOwnProperty('question') ? item.question : false;
			item.number = item.hasOwnProperty('question') ? number : false;
			number ++
			console.log(item.number);
		});

		// Carpeta de recursos desde angular
		self.resources = $rootScope.resources;

		// audio
		self.audio = ko.observable(options.audio);

		// Triggers que se activan cuando la respuesta es correcta/incorrecta
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
		self.failure = ko.observable(false);
		self.success = ko.observable(false);

		// Marcas
		self.rightMark = ko.observable({ right: true });
		self.wrongMark = ko.observable({ right: false });


		/**
		 * Reproduce el audio de la instrucción.
		 */
		self.playAudio = function () {
			$('#audio-instruction')[0].play();
		};


		/**
		 * Define si el target esta lleno utilizando self.maximumElements
		 */
		self.isContainerFull = function (parent) {
			return parent().length < maximumElements;
		};


		/**
		 * Función que se ejecuta al soltar los elementos
		 */
		self.verifyAnswer = function (arg) {
			var item = arg.item,
			target = arg.targetParent;

			if(target._id === item.right){
				// respuesta correcta
				self.rightAnswer(item);
				rightAnswers++;

				if(typeof options.rightAnswerCallback !== "undefined") options.rightAnswerCallback(item);
			} else {
				// respuesta incorrecta
				self.wrongAnswer(item);
			}

			chances--;

			// Final de la actividad
			if(chances === 0){
				if(rightAnswers >= minRightAnswers){
					// éxito
					self.success(true);

					$rootScope.isNextEnabled = true; // Activamos la siguiente ruta en angular

					if(typeof options.successCallback !== "undefined") options.successCallback();

				} else {
					// Fracaso
					self.failure(true);
				}
			}
		}
	};

	/**
	 * Inicializa la instancia del ViewModel creado con dragDropMarkActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	dragDropMarkActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return dragDropMarkActivity;

});


lizDragDropMark.directive('dragDropMark', function  (dragDropMarkActivity) {
	return {
		restrict: 'E',
		transclude: true,
		scope: {
			options: '=',
			audio: '@',
			customClass: '@',
			description: '@'
		},
		templateUrl: '../views/activities/drag_drop_mark.html',
		link: function postLink(scope, element, attrs) {
			// Añadimos el audio a options
			scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;


			// Corremos la aplicación
			dragDropMarkActivity.run(dragDropMarkActivity.create(scope.options));
		}
	}; 
});

/**
 * Actividad donde los elementos pueden ser arrastrados en múltiples grupos
 */
var lizDragDropMultiples = angular.module('lizDragDropMultiples', []);

lizDragDropMultiples.factory('dragDropMultiplesActivity', function ($rootScope) {

  var dragDropMultiplesActivity = {};

  /**
   * Crea el ViewModel
   */
  dragDropMultiplesActivity.create = function (options) {
    return new dragDropMultiplesActivity._ViewModel(options);
  }

  /**
   * Genera el ViewModel de las parejas con sus funcionalidades
   *
   * Recibe un objeto con las siguientes propiedades
   *
   * @param {object}    options            Opciones a utilizar.
   * @param {Array}    options.groups        Grupos definidos. Cada grupo es un objeto que posee las siguientes propiedades
   *
   *  title: Título del bloque donde se sueltan los objetos
   *  items: elementos pertenecientes al grupo
   *
   * @param {integer}    options.chances        Número de posibilidades que tiene el usuario de hacer la actividad
   * @param {integer}    options.minRightAnswers    Número mínimo de respuestas correctas
   * @param {function}  options.successCallback    Función que se llama cuando se termina la actividad de forma satisfactoria
   * @param {function}  options.rightAnswerCallback  Función que se llama cuando la respuesta es correcta
   *
   */
  dragDropMultiplesActivity._ViewModel = function (options) {
    var self = this;

    var Group = function (options) {
      this._id = options._id;
      this.title = options.title;
      this.resource = options.resource ? options.resource : false;
      this.alt = options.alt ? options.alt : false;
      this.items = ko.observableArray();
      this.items._id = this._id;
    }

    var chances = options.chances,
      rightAnswers = 0,
      minRightAnswers = options.minRightAnswers;
      noSuffleArray = options.noSuffleArray;//esta opcion desactiva el orden aleatorio de los items ::: ejemplo esp304 act 5 :::
      self.itemsStyle = options.itemsStyle ? options.itemsStyle : '';

    // ordena el array de forma aleatoria usando el algoritmo de Fisher-Yates
    self.shuffleArray = function (array) {

      if(!noSuffleArray){//es importante para q las palabras queden el el orden deseado 
        for (var i = array.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var temp = array[i];
          array[i] = array[j];
          array[j] = temp;
        }
      }
      return array;
    };

    // Conjunto total de elementos
    self.items = ko.observableArray();
    self.groups = ko.observableArray(); 

    self.resources = $rootScope.resources;

    // audio
    self.audio = ko.observable(options.audio);

    // Triggers que se activan cuando la respuesta es correcta/incorrecta
    self.rightAnswer = ko.observable();
    self.wrongAnswer = ko.observable();

    // Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
    self.failure = ko.observable(false);
    self.success = ko.observable(false);

    // Recorremos cada grupo y cada uno de los elementos, para agregarlos a items
    ko.utils.arrayForEach(options.groups, function (group) {
      // Creamos un nuevo grupo en base a la plantilla creada
     /* group._id = (Math.random() + 1).toString(36).substring(7);*/
      group._id = group.title;
      self.groups.push(new Group(group));

      ko.utils.arrayForEach(group.items, function (item) {
        item._id = item.groupId ? item.groupId : group._id;
        item.title = item.title ? item.title : false;
        self.items.push(item);
      });
    });


    // Organizamos los elementos de forma aleatoria
    self.items(self.shuffleArray(self.items()));

    // Definimos los estilos de cada elemento
    for (var i = 0; i < self.items().length; i++) {
      var width = (100 / self.items().length);
      self.items()[i]._style = "width: " + width + '%; ';
      self.items()[i]._style += "left: " + ( i * width ) + '%';
      self.items()[i]._style += ';' + self.itemsStyle;
    }
    ;

    // Después del constructor, definimos el número de intentos
    chances = options.chances ? options.chances : self.items().length;


    /**
     * Reproduce el audio de la instrucción.
     */
    self.playAudio = function () {
      $('#audio-instruction')[0].play();
    };


    /**
     * Función que se ejecuta cada vez que se suelta un elemento
     */
    self.verify = function (arg) {
      var item = arg.item,
        targetParent = arg.targetParent;

      if (targetParent._id === item._id || ( item.groupId && item.groupId.indexOf(targetParent._id) > -1 )  ) {
        // respuesta correcta
        self.rightAnswer(item);
        rightAnswers++;

        // Reproducimos el audio
        if (targetParent.resource) {
          $('#audio-' + targetParent._id)[0].play();
        }

        if (typeof options.rightAnswerCallback !== "undefined") options.rightAnswerCallback(item);
      } else {
        // respuesta incorrecta
        self.wrongAnswer(item);
        arg.cancelDrop = true;
      }

      // reducimos las posibilidades
      chances--;

      // Fin de la actividad
      if (chances === 0 || self.items().length === 1) {
        if (rightAnswers >= minRightAnswers) {
          // éxito
          self.success(true);

          // Activamos el siguiente
          $rootScope.isNextEnabled = true;

          if (typeof options.rightAnswerCallback !== "undefined") options.rightAnswerCallback(item);
        } else {
          self.failure(true);
        }
      }

    }

    /**
     * Propiedad Computed para el tamaño de los grupos
     */
    self.getGroupWidth = ko.computed(function () {
      return "width: " + (100 / self.groups().length) + "%";
    });

  };

  /**
   * Inicializa la instancia del ViewModel creado con dragDropMultiplesActivity.create
   *
   * @param {object} instance Intancia del VM de knockout
   */
  dragDropMultiplesActivity.run = function (instance) {
    ko.cleanNode($('#main-container')[0]);
    ko.bindingHandlers.sortable.beforeMove = instance.verify;
    ko.applyBindings(instance, $('#main-container')[0]);
  };

  return dragDropMultiplesActivity;
});

lizDragDropMultiples.directive('dragDropMultiples', function (dragDropMultiplesActivity) {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      audio: '@',
      description: '@'
    },
    transclude: true,
    templateUrl: '../views/activities/drag_drop_multiples.html',
    link: function postLink(scope, element, attrs) {
      // Definimos los contenedores y los elementos transcluídos
      var itemChildren = element.find('.transcluded item').children(),
        itemContainer = element.find('.item');

      // Se añade cada uno de los hijos a la plantilla en la posición adecuada
      angular.forEach(itemChildren, function (elem) {
        itemContainer.append(elem);
      });

      // Se elimina el elemento transcluded del DOM
      element.find('.transcluded').remove();

      // Añadimos el audio a options
      scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;

      // Iniciar Knockout
      dragDropMultiplesActivity.run(dragDropMultiplesActivity.create(scope.options));
    }
  };
});

/**
 * Actividad donde los elementos pueden ser arrastrados en múltiples grupos
 */
var lizDragDropMultiplesDiff = angular.module('lizDragDropMultiplesDiff', []);

lizDragDropMultiplesDiff.factory('dragDropMultiplesDiffActivity', function ($rootScope) {

	var dragDropMultiplesDiffActivity = {};

	/**
	 * Crea el ViewModel
	 */
	dragDropMultiplesDiffActivity.create = function (options) {
		return new dragDropMultiplesDiffActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		options						Opciones a utilizar.
	 * @param {Array}		options.groups				Grupos definidos. Cada grupo es un objeto que posee las siguientes propiedades
	 *
	 *	title: Título del bloque donde se sueltan los objetos
	 *	items: elementos pertenecientes al grupo	
	 *
	 * @param {integer}		options.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		options.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {function}	options.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	options.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 *
	 */
	dragDropMultiplesDiffActivity._ViewModel = function (options) {
		var self = this;
		var cc = options.customClass;
	var Group = function (options) {

		this.title = options.title;
		this.resource = options.resource;
		this.alt = options.alt;
		this.items = ko.observableArray();
		this.items._id = options.id;
		this.customClass = (cc) ? cc : "";
	}

	// ordena el array de forma aleatoria usando el algoritmo de Fisher-Yates
	self.shuffleArray = function(array) {
		for (var i = array.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var temp = array[i];
			array[i] = array[j];
			array[j] = temp;
		}
		return array;
	};

	rightAnswers = 0,
	minRightAnswers = options.minRightAnswers;

	self.hasCountdown = (options.hasCountdown) ? true : false;
	self.countdownTime = (options.countdownTime) ? options.countdownTime : "";

	// Conjunto total de elementos
	self.items = ko.observableArray();
	self.groups = ko.observableArray();

	self.resources = $rootScope.resources;

	// Triggers que se activan cuando la respuesta es correcta/incorrecta
	self.rightAnswer = ko.observable();
	self.wrongAnswer = ko.observable();

	// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
	self.failure = ko.observable(false);
	self.success = ko.observable(false);

	// Recorremos cada grupo y cada uno de los elementos, para agregarlos a items
	ko.utils.arrayForEach(options.groups, function (group) {
		// Creamos un nuevo grupo en base a la plantilla creada
		self.groups.push(new Group(group));

		ko.utils.arrayForEach(group.items, function (item) {
			item._id = group.id;
			item.htmlId = item.resource;
			item.chances = options.chancesPerItem-1;
			self.items.push(item);
		});
	});

	// Organizamos los elementos de forma aleatoria
	self.items( self.shuffleArray( self.items()  )  );

	// Definimos los estilos de cada elemento
	for(var i = 0; i < self.items().length; i++){
		var width = (100 / self.items().length);
		self.items()[i]._style = "width: " + width + '%; ';
		self.items()[i]._style += "left: " + ( i * width ) + '%';
	};

	self.playSound = function () {
		$("#audio-instruction").get(0).play();
	};

	// Después del constructor, definimos el número de intentos
	//chances = options.chances ? options.chances : self.items().length; 

	/**
	 * Función que se ejecuta cada vez que se suelta un elemento
	 */
	var counter = 0;
	var numItems = self.items().length;
	self.verify = function (arg) {
		var item = arg.item,
		targetParent = arg.targetParent;

		if(targetParent._id === item._id){
			// respuesta correcta
			self.rightAnswer(item);
			rightAnswers++;
			$("#" + item.htmlId).attr("style", "");
			/*// Reproducimos el audio
			$('#audio-' + targetParent._id)[0].play();*/

			numItems--;
			if(typeof options.rightAnswerCallback !== "undefined") options.rightAnswerCallback(item);
		} else {
			// respuesta incorrecta
			self.wrongAnswer(item);
			arg.cancelDrop = true;
			// reducimos las posibilidades
			if(item.chances === 0){
				$("#" + item.htmlId).hide(200);
				numItems--;
        	}else{item.chances--;}
		}

		// Fin de la actividad
		if(0 === numItems){
			if(rightAnswers >= minRightAnswers){
				// éxito
				self.success(true);

				// Activamos el siguiente
				$rootScope.isNextEnabled = true;

				if(typeof options.rightAnswerCallback !== "undefined") options.rightAnswerCallback(item);
			} else {
				self.failure(true);
			}
		}

	};

	self.countDown = ko.observable();

	ko.bindingHandlers.timer = {

	    update: function (element, valueAccessor) {

	        // retrieve the value from the span
	        var sec = $(element).text();
	        var timer = setInterval(function() { 

	            $(element).text(--sec);
	            if (sec == 0) {
	                if(rightAnswers >= minRightAnswers){
						// éxito
						self.success(true);

						// Activamos el siguiente
						$rootScope.isNextEnabled = true;

						if(typeof options.rightAnswerCallback !== "undefined") options.rightAnswerCallback(item);
					} else {
						self.failure(true);
					}
					clearInterval(timer);	
	            }

	            if (true === self.success() || true === self.failure()) {
	            	clearInterval(timer);
	            }
	        }, 1000);
	    }
	};

	/**
	 * Propiedad Computed para el tamaño de los grupos
	 */
	self.getGroupWidth = ko.computed(function () {
		return "width: " + (100 / self.groups().length) + "%";
	});

};

/**
 * Inicializa la instancia del ViewModel creado con dragDropMultiplesActivity.create
 *
 * @param {object} instance Intancia del VM de knockout
 */
dragDropMultiplesDiffActivity.run = function (instance) {
	ko.cleanNode($('#main-container')[0]);
	ko.bindingHandlers.sortable.beforeMove = instance.verify;
	ko.applyBindings(instance, $('#main-container')[0]);
};

return dragDropMultiplesDiffActivity;
});


lizDragDropMultiplesDiff.directive('dragDropMultiplesDiff', function  (dragDropMultiplesDiffActivity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			description: '@',
			audio: '@'
		},
		transclude: true,
		templateUrl: '../views/activities/drag_drop_multiples_diff.html',
		link: function postLink(scope, element, attrs) {
			// Definimos los contenedores y los elementos transcluídos
			var itemChildren = element.find('.transcluded item').children(),
			itemContainer = element.find('.item');

			// Se añade cada uno de los hijos a la plantilla en la posición adecuada
			angular.forEach(itemChildren, function (elem) { itemContainer.append(elem); });

			// Se elimina el elemento transcluded del DOM
			element.find('.transcluded').remove();

			// Iniciar Knockout
			dragDropMultiplesDiffActivity.run(dragDropMultiplesDiffActivity.create(scope.options));
		}
	}; 
});

/**
 * Actividad donde los elementos pueden ser arrastrados en múltiples grupos
 */
var lizDragDropMultiplesPositions = angular.module('lizDragDropMultiplesPositions', []);

lizDragDropMultiplesPositions.factory('dragDropMultiplesPositionsActivity', function ($rootScope) {

  var dragDropMultiplesPositionsActivity = {};

  /**
   * Crea el ViewModel
   */
  dragDropMultiplesPositionsActivity.create = function (options) {
    return new dragDropMultiplesPositionsActivity._ViewModel(options);
  }

  /**
   * Genera el ViewModel de las parejas con sus funcionalidades
   *
   * Recibe un objeto con las siguientes propiedades
   *
   * @param {object}    options            Opciones a utilizar.
   * @param {Array}    options.groups        Grupos definidos. Cada grupo es un objeto que posee las siguientes propiedades
   *
   *  title: Título del bloque donde se sueltan los objetos
   *  items: elementos pertenecientes al grupo
   *
   * @param {integer}    options.chances        Número de posibilidades que tiene el usuario de hacer la actividad
   * @param {integer}    options.minRightAnswers    Número mínimo de respuestas correctas
   * @param {function}  options.successCallback    Función que se llama cuando se termina la actividad de forma satisfactoria
   * @param {function}  options.rightAnswerCallback  Función que se llama cuando la respuesta es correcta
   *
   */
  dragDropMultiplesPositionsActivity._ViewModel = function (options) {
    var self = this;

    var Group = function (options) {
      this._id = options.title; /*options.groupId ? options.groupId : options._id;*/
      this.title = options.title;
      this.w = options.w;
      this.h = options.h;
      this.t = options.t;
      this.l = options.l;
      this.resource = options.resource ? options.resource : false;
      this.alt = options.alt ? options.alt : false;
      this.items = ko.observableArray();
      this.items._id = this._id;
    }

    // ordena el array de forma aleatoria usando el algoritmo de Fisher-Yates
    
    self.shuffleArray = function (array) {
      if (self.randomitems === true){
        for (var i = array.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var temp = array[i];
          array[i] = array[j];
          array[j] = temp;
        }
        return array;
      };
      return array;
    };

    var chances = options.chances,
      rightAnswers = 0,
      minRightAnswers = options.minRightAnswers;
      self.canvas = options.canvas; // La imagen en sí
      self.canvasAlt = options.canvasAlt; // texto alternativo de la imagen pricipal
      self.canvasContainerStyle = options.canvasContainerStyle;//estilos del contenedor de la imagen principal 
      self.randomitems = options.randomitems  //ordenar aleatoreamente el array de items

    // Conjunto total de elementos
    self.items = ko.observableArray();
    self.groups = ko.observableArray();

    self.resources = $rootScope.resources;

    // audio
    self.audio = ko.observable(options.audio);

    // Triggers que se activan cuando la respuesta es correcta/incorrecta
    self.rightAnswer = ko.observable();
    self.wrongAnswer = ko.observable();

    // Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
    self.failure = ko.observable(false);
    self.success = ko.observable(false);

    // Recorremos cada grupo y cada uno de los elementos, para agregarlos a items
    ko.utils.arrayForEach(options.groups, function (group) {
      // Creamos un nuevo grupo en base a la plantilla creada
      group._id = group.title /*(Math.random() + 1).toString(36).substring(7);*/
      self.groups.push(new Group(group));

      ko.utils.arrayForEach(group.items, function (item) {
        /*item._id = group._id;*/
        item._id = item.groupId ? item.groupId : group._id;
        self.items.push(item);
      });
    });


    // Organizamos los elementos de forma aleatoria
    self.items(self.shuffleArray(self.items()));

    // Definimos los estilos de cada elemento
    for (var i = 0; i < self.items().length; i++) {
      var width = (100 / self.items().length);
      self.items()[i]._style = "width: " + width + '%; ';
      self.items()[i]._style += "left: " + ( i * width ) + '%';
    }
    ;

    // Después del constructor, definimos el número de intentos
    chances = options.chances ? options.chances : self.items().length;


    /**
     * Reproduce el audio de la instrucción.
     */
    self.playAudio = function () {
      $('#audio-instruction')[0].play();
    };


    /**
     * Función que se ejecuta cada vez que se suelta un elemento
     */
    self.verify = function (arg) {

      var item = arg.item,
        targetParent = arg.targetParent;
        
      if (targetParent._id === item._id || item._id.indexOf(targetParent._id) > -1){
        // respuesta correcta
        self.rightAnswer(item);
        rightAnswers++;

        // Reproducimos el audio
        if (targetParent.resource) {
          $('#audio-' + targetParent._id)[0].play();
        }

        if (typeof options.rightAnswerCallback !== "undefined") options.rightAnswerCallback(item);
      } else {
        // respuesta incorrecta
        self.wrongAnswer(item);
        arg.cancelDrop = true;
      }

      // reducimos las posibilidades
      chances--;

      // Fin de la actividad
      if (chances === 0 || self.items().length === 1) {
        if (rightAnswers >= minRightAnswers) {
          // éxito
          self.success(true);

          // Activamos el siguiente
          $rootScope.isNextEnabled = true;

          if (typeof options.rightAnswerCallback !== "undefined") options.rightAnswerCallback(item);
        } else {
          self.failure(true);
        }
      }

    }

    /**
     * Propiedad Computed para el tamaño de los grupos
     */
   self.getTargetsStyles = function (item) {
      console.log(item);
      var styles = '';
      /*return "width: " + (100 / self.groups().length) + "%";*/

      styles += 'width: ' + item.w + '%;';
      styles += 'height: ' + item.h + '%;';
      styles += 'top: ' + item.t + '%;';
      styles += 'left: ' + item.l + '%;';

      return styles;
    };

  };

  /**
   * Inicializa la instancia del ViewModel creado con dragDropMultiplesPositionsActivity.create
   *
   * @param {object} instance Intancia del VM de knockout
   */
  dragDropMultiplesPositionsActivity.run = function (instance) {
    ko.cleanNode($('#main-container')[0]);
    ko.bindingHandlers.sortable.beforeMove = instance.verify;
    ko.applyBindings(instance, $('#main-container')[0]);
  };

  return dragDropMultiplesPositionsActivity;
});

lizDragDropMultiplesPositions.directive('dragDropMultiplesPositions', function (dragDropMultiplesPositionsActivity) {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      audio: '@',
      description: '@'
    },
    transclude: true,
    templateUrl: '../views/activities/drag_drop_multiples_positions.html',
    link: function postLink(scope, element, attrs) {
      // Definimos los contenedores y los elementos transcluídos
      var itemChildren = element.find('.transcluded item').children(),
        itemContainer = element.find('.item');

      // Se añade cada uno de los hijos a la plantilla en la posición adecuada
      angular.forEach(itemChildren, function (elem) {
        itemContainer.append(elem);
      });

      // Se elimina el elemento transcluded del DOM
      element.find('.transcluded').remove();

      // Añadimos el audio a options
      scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;

      // Iniciar Knockout
      dragDropMultiplesPositionsActivity.run(dragDropMultiplesPositionsActivity.create(scope.options));
    }
  };
});

var lizDragDropPairText = angular.module('lizDragDropPairText', []);

// Knockout Pairs Factory
lizDragDropPairText.factory('dragDropPairTextActivity', function ($rootScope) {

	var dragDropPairTextActivity = {};

  /**
   * Crea el ViewModel
   */
  dragDropPairTextActivity.create = function (options) {
    return new dragDropPairTextActivity._ViewModel(options);
  };

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		opt						Opciones a utilizar.
	 * @param {Array}			opt.data				Información de los elementos. Dentro de cada objeto, se pueden definir las propiedades:
	 *
	 *	target: Permite darle un orden apropiado a los targets. Debe empezar desde 0 y la propiedad opt.randomTargets debe estar desactivada
	 *
	 * @param {integer}		opt.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		opt.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {boolean}		opt.randomItems			Define si los elementos deben ser puestos en forma aleatoria
	 * @param {boolean}		opt.randomTargets		Define si los objetivos debe ser puestos en forma aleatoria
	 * @param {function}	opt.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	opt.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 *
	 */
	dragDropPairTextActivity._ViewModel = function (opt) {
		var self = this;

		// ordena el array de forma aleatoria usando el algoritmo de Fisher-Yates
		self.shuffleArray = function(array) {
			for (var i = array.length - 1; i > 0; i--) {
				var j = Math.floor(Math.random() * (i + 1));
				var temp = array[i];
				array[i] = array[j];
				array[j] = temp;
			}
			return array;
		};

		// Inicializa las opciones
		var data = opt.data,
      minRightAnswers = opt.minRightAnswers ? opt.minRightAnswers : data.length,
      randomItems = opt.randomItems ? true : false,
      randomTargets = opt.randomTargets ? true : false,
      chances = opt.chances ? opt.chances : data.length,
      targets_data = data.slice(0),   // Clonamos el array para empezar a trabajar
      completedItems = 0, // contador de elementos completos
      border = opt.hasOwnProperty('border') ? opt.border : true,
      padding = opt.hasOwnProperty('padding') ? opt.padding : true;

		// Objetos aleatorios
		if(randomItems) {
			data = self.shuffleArray(data);
		}

		// Creamos los índices para la posición absoluta
		for(var i = 0; i < data.length; i++){
			data[i]._index = i;
		}

		self.itemsPerRow = (opt.hasOwnProperty("itemsPerRow")) ? opt.itemsPerRow : opt.data.length;

		// audio
		self.audio = ko.observable(opt.audio);

		// Definimos los observableArrays para items y targets
		self.items = ko.observableArray(data);
		self.targets = ko.observableArray();

		// Carpeta de recursos desde angular
		self.resources = $rootScope.resources;

		self.maximumElements = 1; // IMPORTANTE: Requerido para que los sortables no acepten más de un elemento
		self.rightAnswers = 0; // Inicializamos el número de respuestas buenas a 0

		// Triggers que se activan cuando la respuesta es correcta/incorrecta
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
		self.failure = ko.observable(false);
		self.success = ko.observable(false);

		// ======================================================================================
		// Constructor de los targets
		// ======================================================================================

		// Si la opción de randomTargets está activada, aplicamos el orden aleatorio
		if(randomTargets){
			targets_data = self.shuffleArray(targets_data);
		} else {
			// En caso contrario, se utiliza la propiedad target, dentro del array de data
			targets_data.sort(function (a, b) {
				return ((a.target < b.target) ? -1 : ((a.target > b.target) ? 1 : 0));
			});
		}

		var _index = 1; // índice que se le asignará a cada uno de los elementos

		ko.utils.arrayForEach(targets_data, function (item) {
			// Creamos el nuevo target. Añadimos un índice para hacer la relación 1 a 1
			item._items = ko.observableArray();
			if (opt.hasOwnProperty("chancesPerItem")) {
				item.chances = opt.chancesPerItem - 1;
			}
			item._items._id = _index++;

			self.targets.push(item);
		});
		
		// ======================================================================================
		// FIN Constructor
		// ======================================================================================

		/**
		 * Reproduce el audio de la instrucción.
		 */
		self.playAudio = function () {
			$('#audio-instruction')[0].play();
		};

		// Define si el target esta lleno utilizando self.maximumElements
		self.isContainerFull = function (parent) {
			return parent().length < self.maximumElements;
		};


		// Función que se ejecuta cuando se suelta el elemento y hace toda la funcionalidad
		self.verifyAnswer = function (arg) {
			var parent = arg.targetParent,
			item = arg.item;
         

			// Si el target es igual al contenedor inicial, se devuelve a su posición original
			if(typeof parent._id === "undefined") {
				arg.cancelDrop = true;
				return;
			} else {
				// Compara el _id para encontrar la pareja idéntica. Si es igual, la respuesta es correcta
				if(parent._id === item._items._id){

					// RESPUESTA CORRECTA
					self.rightAnswers++;
					self.rightAnswer(item);
          			completedItems += 1;
          			// Reducimos en 1 las posibilidades
					chances -= 1;

					// Si se definió una función cuando la respuesta es correcta, se corre
					if(typeof opt.rightAnswerCallback !== "undefined" ) opt.rightAnswerCallback(item);

				} else {

					// RESPUESTA INCORRECTA
					self.wrongAnswer(item);
					arg.cancelDrop = true;

					if (item.hasOwnProperty("chances")) {
						if(item.chances === 0){
							// Reducimos en 1 las posibilidades
							chances -= 1;
							$("#" + item._items._id).hide(200);
			        	}else{item.chances--;}
					} else {
						// Reducimos en 1 las posibilidades
						chances -= 1;
					}
				}
			}

			// La actividad termina cuando el número de posibilidades se termina
			if(chances === 0 || completedItems === self.targets().length) {
				// Si el número de respuestas correctas es mayor o igual al requerido inicialmente
				if(self.rightAnswers >= minRightAnswers) {
					self.success(true); // Trigger de éxito

					// Se llama la función de éxito, definida por el desarrollador
					if (typeof opt.successCallback !== "undefined") opt.successCallback();

					$rootScope.isNextEnabled = true; // Activamos el siguiente
				} else {
					self.failure(true); // Trigger de fracaso
				}
			}
		};

    /**
     * Estilos de los elementos.
     */
     var _itemIndex = 0;
    self.getItemStyles = function (item) {
      var styles = '';

     //  if (opt.hasOwnProperty("itemsPerRow")) {
     //  	if (_itemIndex === opt.itemsPerRow) {
     //  		_itemIndex = 0;
     //  	}

     //  	if (item._index >= opt.itemsPerRow) {
  			// styles += 'top: 33%;';
     //  	}
     //  	styles += 'width: ' + (100 / opt.itemsPerRow) + '%;';
     //  	styles += 'left: ' + ((100 / opt.itemsPerRow) * _itemIndex ) + '%;';
     //  	_itemIndex++
     //  } else {
      	styles += 'width: ' + (100 / self.targets().length) + '%;';
      

      
      	styles += 'left: ' + ((100 / self.targets().length) * item._index ) + '%;';
      // }
      
      styles += 'position: absolute;';
      return styles;
    };

    /**
     * Estilos de cada objetivo.
     * @returns {string}
     */
    self.getTargetStyles = function () {
      var styles = '';

      if (opt.hasOwnProperty("itemsPerRow")) {
  		styles += 'width: ' + (100 / opt.itemsPerRow) + '%;';
      } else {
      	styles += 'width: ' + (100 / self.targets().length) + '%;';
      }
      
      if(typeof opt.targetStyles !== "undefined") styles += opt.targetStyles;

      return styles;
    };

		/**
		 * Estilos para elementos internos de target e item.
		 */
		self.getInnerStyles = function (item) {
			var styles = '';

			// Estilos Opcionales
			if(border) styles += 'border: 4px solid #000;';
			if(padding) styles += 'padding: 4px;';

			return styles;
		}

	};

	/**
	 * Inicializa la instancia del ViewModel creado con pairsActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	dragDropPairTextActivity.run = function (instance) {
		console.log(ko.bindingHandlers);
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return dragDropPairTextActivity;

});

lizDragDropPairText.directive('dragDropPairText', function  (dragDropPairTextActivity) {
	return {
		restrict: 'E',
		transclude: true,
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			customClass: '@'
		},
		templateUrl: '../views/activities/drag_drop_pair_text.html',
		link: function postLink(scope, element, attrs) {
			console.log(arguments);
			if(typeof scope.customClass !== "undefined"){
				scope.$root.customClass = scope.customClass;
			}

			// Definimos los contenedores y los elementos transcluídos
			var itemChildren = element.find('.transcluded item').children(),
			itemContainer = element.find('.item'),
			targetChildren = element.find('.transcluded target').children(),
			targetContainer = element.find('.target')
			itemTargetChildren = element.find('.transcluded item-target').children(),
			itemTargetContainer = element.find('.item-target');

			// Se añade cada uno de los hijos a la plantilla en la posición adecuada
			angular.forEach(itemChildren, function (elem) { itemContainer.append(elem); });
			angular.forEach(targetChildren, function (elem) { targetContainer.append(elem); });
			angular.forEach(itemTargetChildren, function (elem) { itemTargetContainer.append(elem); });

			// Se elimina el elemento transcluded del DOM
			element.find('.transcluded').remove();

			// Añadimos el audio a options
			// scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;

			// Corremos la aplicación
			var vm = dragDropPairTextActivity.create(scope.options);
			dragDropPairTextActivity.run(vm);
		}
	}; 
});

var lizDragMarkCanvas = angular.module('lizDragMarkCanvas', []);

// Knockout Pairs Factory
lizDragMarkCanvas.factory('dragMarkCanvasActivity', function ($rootScope) {

	var dragMarkCanvasActivity = {};

	/**
	 * Crea el ViewModel
	 */
	dragMarkCanvasActivity.create = function (options) {
		return new dragMarkCanvasActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		options						Opciones a utilizar.
	 * @param {Array}			options.data				Información de los elementos. Dentro de cada objeto, se pueden definir las propiedades:
	 *
	 *	target: Permite darle un orden apropiado a los targets. Debe empezar desde 0 y la propiedad options.randomTargets debe estar desactivada
	 *
	 * @param {integer}		options.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		options.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {boolean}		options.randomItems			Define si los elementos deben ser puestos en forma aleatoria
	 * @param {boolean}		options.randomTargets		Define si los objetivos debe ser puestos en forma aleatoria
	 * @param {function}	options.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	options.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 *
	 */
	dragMarkCanvasActivity._ViewModel = function (opt) {
		var self = this,
			chances = opt.chances,
			minRightAnswers = opt.minRightAnswers,
			temp = false;

		// Elementos de la actividad
		self.canvas = opt.canvas;
		self.alt = opt.alt;
		self.items = opt.items; // Elementos que se arrastran
		self.targets = ko.observableArray(); // Targets 

		self.items.forEach(function(item){
			item.targets.forEach(function(target){
				temp = {
					sortable: ko.observableArray(),
					t: target.t,
					l: target.l,
					w: target.w,
					h: target.h
				};

				temp.sortable._id = item.drag;

				// Añadimos el elemento a los targets
				self.targets.push(temp);
			});
		});

		// audio
		self.audio = ko.observable(opt.audio);

		// Carpeta de recursos desde angular
		self.resources = $rootScope.resources;

		self.maximumElements = 1; // IMPORTANTE: Requerido para que los sortables no acepten más de un elemento
		self.rightAnswers = 0; // Inicializamos el número de respuestas buenas a 0

		// Triggers que se activan cuando la respuesta es correcta/incorrecta
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
		self.failure = ko.observable(false);
		self.success = ko.observable(false);




		/**
		 * Reproduce el audio de la instrucción.
		 */
		self.playAudio = function () {
			$('#audio-instruction')[0].play();
		};

		/**
		 * Define si el target esta lleno utilizando self.maximumElements
		 */
		self.isContainerFull = function (parent) {
			return parent().length < self.maximumElements;
		};


		/**
		 * Obtiene los estilos de los targets
		 */
		self.getTargetStyles = function (target) {
			var styles = '';

			styles += 'top: ' + target.t + '%;';
			styles += 'left: ' + target.l + '%;';
			styles += 'width: ' + target.w + '%;';
			styles += 'height: ' + target.h + '%;';

			return styles;
		};


		/**
		 * Función que se ejecuta cuando se suelta el elemento y hace toda la funcionalidad
		 */
		self.verifyAnswer = function (arg) {
			var parent = arg.targetParent,
				item = arg.item;

			if(parent._id === item.drag){
				// RESPUESTA CORRECTA
				self.rightAnswers++;
				self.rightAnswer(item);

				// Si se definió una función cuando la respuesta es correcta, se corre
				if(typeof opt.rightAnswerCallback !== "undefined" ) opt.rightAnswerCallback(item);
			} else {
				// RESPUESTA INCORRECTA
				self.wrongAnswer(item);
				arg.cancelDrop = true;
			}

			// Reducimos en 1 las posibilidades
			chances--;

			// La actividad termina cuando el número de posibilidades se termina
			if(chances === 0 || self.rightAnswers === self.targets().length) {
				// Si el número de respuestas correctas es mayor o igual al requerido inicialmente
				if(self.rightAnswers >= minRightAnswers) {
					self.success(true); // Trigger de éxito

					// Se llama la función de éxito, definida por el desarrollador
					if (typeof opt.successCallback !== "undefined") opt.successCallback();

					$rootScope.isNextEnabled = true; // Activamos el siguiente
				} else {
					self.failure(true); // Trigger de fracaso
				}
			}
		};

	};

	/**
	 * Inicializa la instancia del ViewModel creado con dragMarkCanvasActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	dragMarkCanvasActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return dragMarkCanvasActivity;

});

lizDragMarkCanvas.directive('dragMarkCanvas', function  (dragMarkCanvasActivity) {
	return {
		restrict: 'E',
		transclude: true,
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			customClass: '@'
		},
		templateUrl: '../views/activities/drag_mark_canvas.html',
		link: function postLink(scope, element, attrs) {
			// Añadimos el audio a options
			scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;

			// Corremos la aplicación
			var vm = dragMarkCanvasActivity.create(scope.options);
			dragMarkCanvasActivity.run(vm);
		}
	}; 
});

var lizDragToImg = angular.module('lizDragToImg', ['ngDragDrop']);

lizDragToImg.directive('dragToImg', function  ($compile) {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      audio: '@',
      description: '@'
    },
    templateUrl: '../views/activities/drag_to_img.html',
    link: function (scope, element, attrs) {
      var opt = scope.options,
        replaceArray = [], // array con los índices de los targets
        targetCounter = 0, // Variable temporal usada como contador
        rightAnswers = 0, // contador de respuestas correctas
        minRightAnswers = opt.minRightAnswers, // respuestas correctas mínimas para pasar
        template = opt.template;

      // Models
      // --------------------------------------------------------------------
      scope.items = [];
      scope.targets = [];

      // img
      scope.src = opt.src;
      scope.alt = opt.alt;

      // iteramos sobre los objetos, para construir los draggables
      opt.items.forEach(function (item, index) {
        var _data = null;

        if(typeof item === 'object') _data = item.data;
        else _data = item;

        // Creación de item
        if(_data instanceof Array) {
          _data.forEach(function (i) {
            scope.items.push({
              _id: index,
              text: i
            });
          });
        } else {
          scope.items.push({
            _id: index,
            text: _data
          });
        }

      });

      // Template Creation
      // --------------------------------------------------------------------
      // Usamos replace para obtener los índices
      template.replace(/\$\{(\d+)\}/g, function (a, b) {
        a = a.substr(2, a.length - 3); // Remueve los elementos que producen la interpolación
        replaceArray.push(a);
        return false;
      });

      replaceArray.forEach(function (i) {
        // Creación de target
        scope.targets.push({
          _id: parseInt(i),
          drop: true,
          chances: 2,
          customClass: opt.items[i].customClass ? opt.items[i].customClass : '',
          model: {} // droppable
        });
      });

      // Formateamos el contenido para añadirlo a .operation-content
      template = template.replace(/\$\{(\d+)\}/g, function (a, b) {
        a = "targets[" + targetCounter + "]";
        targetCounter += 1;

        var elem = '<span class="drop-container bd-1 {{ _x_.customClass }}" ng-class="{ disabled: _x_.disabled }" data-drop="_x_.drop" ng-model="_x_.model" jqyoui-droppable="{ onDrop: \'dropCallback(_x_)\' }">\n    <span class="dropped-item">{{ _x_.model.text }}</span>\n    <span class="answer-icon icon-right" ng-show="_x_.right"></span>\n    <span class="answer-icon icon-wrong" ng-show="_x_.wrong"></span>\n</span>\n';

        return elem.replace(/_x_/g, a);
      });

      element.find('.template-container').append($compile(template)(scope));

      // Events
      // --------------------------------------------------------------------
      /**
       * Función que se ejecuta al soltar un elemento.
       *
       * @param e    event de jquery ui
       * @param ui
       * @param target    Modelo donde fue soltado el item
       */
      scope.dropCallback = function (e, ui, target) {
        var completedTargets = 0;
        console.log(e, ui, target);

        // revisa el modelo interno y compara _ids
        if(target._id === target.model._id) {
          // Respuesta correcta
          target.drop = false; // deshabilita el drop
          target.disabled = true;
          target.right = true;

          rightAnswers += 1;
        } else {
          // Respuesta incorrecta
          target.model = {}; // limpia el interno
          target.chances -= 1;

          if(target.chances === 0) {
            target.disabled = true;
            target.wrong = true;
          }
        }

        // Fin de la actividad
        completedTargets = scope.targets.filter(function (t) {
          return t.disabled;
        }).length;

        if(completedTargets === scope.targets.length) {
          scope.$root.isNextEnabled = true;
        }
      };

      /**
       * Función que se ejecuta al dar click en la flecha de siguiente.
       */
      scope.$root.beforeGoNext = function () {
        if(rightAnswers >= minRightAnswers) {
          scope.success = true;
          return true;
        } else {
          scope.failure = true;
          return false;
        }
      };


    }
  };
});

var lizDragToMat = angular.module('lizDragToMat', ['ngDragDrop']);

lizDragToMat.directive('dragToMat', function  ($compile) {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      audio: '@',
      description: '@',
    },
    templateUrl: '../views/activities/drag_to_mat.html',
    link: function (scope, element, attrs) {
      var opt = scope.options,
        replaceArray = [], // array con los índices de los targets
        targetCounter = 0, // Variable temporal usada como contador
        rightAnswers = 0, // contador de respuestas correctas
        minRightAnswers = opt.minRightAnswers, // respuestas correctas mínimas para pasar
        template = opt.template;

      // Models
      // --------------------------------------------------------------------
      scope.items = [];
      scope.targets = [];

      // img
      scope.src = opt.src;
      scope.alt = opt.alt;
    
      // iteramos sobre los objetos, para construir los draggables
      opt.items.forEach(function (item, index) {
        var _data = null;

        if(typeof item === 'object') _data = item.data;
        else _data = item;

        // Creación de item
        if(_data instanceof Array) {
          _data.forEach(function (i) {
            scope.items.push({
              _id: index,
              text: i
            });
          });
        } else {
          scope.items.push({
            _id: index,
            text: _data
          });
        }

      });

      // Template Creation
      // --------------------------------------------------------------------
      // Usamos replace para obtener los índices
      template.replace(/\$\{(\d+)\}/g, function (a, b) {
        a = a.substr(2, a.length - 3); // Remueve los elementos que producen la interpolación
        replaceArray.push(a);
        return false;
      });

      replaceArray.forEach(function (i) {
        // Creación de target
        scope.targets.push({
          _id: parseInt(i),
          drop: true,
          chances: 2,
          customClass: opt.items[i].customClass ? opt.items[i].customClass : '',
          model: {} // droppable
        });
      });

      // Formateamos el contenido para añadirlo a .operation-content
      template = template.replace(/\$\{(\d+)\}/g, function (a, b) {
        a = "targets[" + targetCounter + "]";
        targetCounter += 1;

        var elem = '<span class="drop-container bd-1 {{ _x_.customClass }}" ng-class="{ disabled: _x_.disabled }" data-drop="_x_.drop" ng-model="_x_.model" jqyoui-droppable="{ onDrop: \'dropCallback(_x_)\' }">\n    <span class="dropped-item">{{ _x_.model.text }}</span>\n    <span class="answer-icon icon-right" ng-show="_x_.right"></span>\n    <span class="answer-icon icon-wrong" ng-show="_x_.wrong"></span>\n</span>\n';

        return elem.replace(/_x_/g, a);
      });

      element.find('.template-container').append($compile(template)(scope));

      // Events
      // --------------------------------------------------------------------
      /**
       * Función que se ejecuta al soltar un elemento.
       *
       * @param e    event de jquery ui
       * @param ui
       * @param target    Modelo donde fue soltado el item
       */
      scope.dropCallback = function (e, ui, target) {
        var completedTargets = 0;
        console.log(e, ui, target);

        // revisa el modelo interno y compara _ids
        if(target._id === target.model._id) {
          // Respuesta correcta
          target.drop = false; // deshabilita el drop
          target.disabled = true;
          target.right = true;

          rightAnswers += 1;
        } else {
          // Respuesta incorrecta
          target.model = {}; // limpia el interno
          target.chances -= 1;

          if(target.chances === 0) {
            target.disabled = true;
            target.wrong = true;
          }
        }

        // Fin de la actividad
        completedTargets = scope.targets.filter(function (t) {
          return t.disabled;
        }).length;

        if(completedTargets === scope.targets.length) {
          scope.$root.isNextEnabled = true;
        }
      };

      /**
       * Función que se ejecuta al dar click en la flecha de siguiente.
       */
      scope.$root.beforeGoNext = function () {
        if(rightAnswers >= minRightAnswers) {
          scope.success = true;
          return true;
        } else {
          scope.failure = true;
          return true;
        }
      };


    }
  };
});

var lizDragToText = angular.module('lizDragToText', ['ngDragDrop']);

lizDragToText.directive('dragToText', function  ($compile) {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      audio: '@',
      description: '@'
    },
    templateUrl: '../views/activities/drag_to_text.html',
    link: function (scope, element, attrs) {
      var opt = scope.options,
        replaceArray = [], // array con los índices de los targets
        targetCounter = 0, // Variable temporal usada como contador
        rightAnswers = 0, // contador de respuestas correctas
        minRightAnswers = opt.minRightAnswers, // respuestas correctas mínimas para pasar
        template = opt.template;

      // Models
      // --------------------------------------------------------------------
      scope.items = [];
      scope.targets = [];

      // img
      scope.src = opt.src;
      scope.alt = opt.alt;

      // iteramos sobre los objetos, para construir los draggables
      opt.items.forEach(function (item, index) {
        var _data = null;

        if(typeof item === 'object') _data = item.data;
        else _data = item;

        // Creación de item
        if(_data instanceof Array) {
          _data.forEach(function (i) {
            scope.items.push({
              _id: index,
              text: i
            });
          });
        } else {
          scope.items.push({
            _id: index,
            text: _data
          });
        }

      });

      // Template Creation
      // --------------------------------------------------------------------
      // Usamos replace para obtener los índices
      template.replace(/\$\{(\d+)\}/g, function (a, b) {
        a = a.substr(2, a.length - 3); // Remueve los elementos que producen la interpolación
        replaceArray.push(a);
        return false;
      });

      replaceArray.forEach(function (i) {
        // Creación de target
        scope.targets.push({
          _id: parseInt(i),
          drop: true,
          chances: 2,
          customClass: opt.items[i].customClass ? opt.items[i].customClass : '',
          model: {} // droppable
        });
      });

      // Formateamos el contenido para añadirlo a .operation-content
      template = template.replace(/\$\{(\d+)\}/g, function (a, b) {
        a = "targets[" + targetCounter + "]";
        targetCounter += 1;

        var elem = '<span class="drop-container bd-1 {{ _x_.customClass }}" ng-class="{ disabled: _x_.disabled }" data-drop="_x_.drop" ng-model="_x_.model" jqyoui-droppable="{ onDrop: \'dropCallback(_x_)\' }">\n    <span class="dropped-item">{{ _x_.model.text }}</span>\n    <span class="answer-icon icon-right" ng-show="_x_.right"></span>\n    <span class="answer-icon icon-wrong" ng-show="_x_.wrong"></span>\n</span>\n';

        return elem.replace(/_x_/g, a);
      });

      element.find('.template-container').append($compile(template)(scope));

      // Events
      // --------------------------------------------------------------------
      /**
       * Función que se ejecuta al soltar un elemento.
       *
       * @param e    event de jquery ui
       * @param ui
       * @param target    Modelo donde fue soltado el item
       */
      scope.dropCallback = function (e, ui, target) {
        var completedTargets = 0;
        console.log(e, ui, target);

        // revisa el modelo interno y compara _ids
        if(target._id === target.model._id) {
          // Respuesta correcta
          target.drop = false; // deshabilita el drop
          target.disabled = true;
          target.right = true;

          rightAnswers += 1;
        } else {
          // Respuesta incorrecta
          target.model = {}; // limpia el interno
          target.chances -= 1;

          if(target.chances === 0) {
            target.disabled = true;
            target.wrong = true;
          }
        }

        // Fin de la actividad
        completedTargets = scope.targets.filter(function (t) {
          return t.disabled;
        }).length;

        if(completedTargets === scope.targets.length) {
          scope.$root.isNextEnabled = true;
        }
      };

      /**
       * Función que se ejecuta al dar click en la flecha de siguiente.
       */
      scope.$root.beforeGoNext = function () {
        if(rightAnswers >= minRightAnswers) {
          scope.success = true;
          return true;
        } else {
          scope.failure = true;
          return false;
        }
      };


    }
  };
});

var lizDragToTexts = angular.module('lizDragToTexts', ['ngDragDrop']);

lizDragToTexts.directive('dragToTexts', function  ($compile) {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      audio: '@',
      description: '@'
    },
    templateUrl: '../views/activities/drag_to_texts.html',
    link: function (scope, element, attrs) {
      var opt = scope.options,
        replaceArray = [], // array con los índices de los targets
        targetCounter = 0, // Variable temporal usada como contador
        rightAnswers = 0, // contador de respuestas correctas
        minRightAnswers = opt.minRightAnswers, // respuestas correctas mínimas para pasar
        template = opt.template;

      // Models
      // --------------------------------------------------------------------
      scope.items = [];
      scope.targets = [];

      // img
      scope.src = opt.src;
      scope.alt = opt.alt;

      // iteramos sobre los objetos, para construir los draggables
      opt.items.forEach(function (item, index) {
        var _data = null;

        if(typeof item === 'object') _data = item.data;
        else _data = item;

        // Creación de item
        if(_data instanceof Array) {
          _data.forEach(function (i) {
            scope.items.push({
              _id: index,
              text: i
            });
          });
        } else {
          scope.items.push({
            _id: index,
            text: _data
          });
        }

      });

      // Template Creation
      // --------------------------------------------------------------------
      // Usamos replace para obtener los índices
      template.replace(/\$\{(\d+)\}/g, function (a, b) {
        a = a.substr(2, a.length - 3); // Remueve los elementos que producen la interpolación
        replaceArray.push(a);
        return false;
      });

      replaceArray.forEach(function (i) {
        // Creación de target
        scope.targets.push({
          _id: parseInt(i),
          drop: true,
          chances: 2,
          customClass: opt.items[i].customClass ? opt.items[i].customClass : '',
          model: {} // droppable
        });
      });

      // Formateamos el contenido para añadirlo a .operation-content
      template = template.replace(/\$\{(\d+)\}/g, function (a, b) {
        a = "targets[" + targetCounter + "]";
        targetCounter += 1;

        var elem = '<span class="drop-container bd-1 {{ _x_.customClass }}" ng-class="{ disabled: _x_.disabled }" data-drop="_x_.drop" ng-model="_x_.model" jqyoui-droppable="{ onDrop: \'dropCallback(_x_)\' }">\n    <span class="dropped-item">{{ _x_.model.text }}</span>\n    <span class="answer-icon icon-right" ng-show="_x_.right"></span>\n    <span class="answer-icon icon-wrong" ng-show="_x_.wrong"></span>\n</span>\n';

        return elem.replace(/_x_/g, a);
      });

      element.find('.template-container').append($compile(template)(scope));

      // Events
      // --------------------------------------------------------------------
      /**
       * Función que se ejecuta al soltar un elemento.
       *
       * @param e    event de jquery ui
       * @param ui
       * @param target    Modelo donde fue soltado el item
       */
      scope.dropCallback = function (e, ui, target) {
        var completedTargets = 0;
        console.log(e, ui, target);

        // revisa el modelo interno y compara _ids
        if(target._id === target.model._id) {
          // Respuesta correcta
          target.drop = false; // deshabilita el drop
          target.disabled = true;
          target.right = true;

          rightAnswers += 1;
        } else {
          // Respuesta incorrecta
          target.model = {}; // limpia el interno
          target.chances -= 1;

          if(target.chances === 0) {
            target.disabled = true;
            target.wrong = true;
          }
        }

        // Fin de la actividad
        completedTargets = scope.targets.filter(function (t) {
          return t.disabled;
        }).length;

        if(completedTargets === scope.targets.length) {
          scope.$root.isNextEnabled = true;
        }
      };

      /**
       * Función que se ejecuta al dar click en la flecha de siguiente.
       */
      scope.$root.beforeGoNext = function () {
        if(rightAnswers >= minRightAnswers) {
          scope.success = true;
          return true;
        } else {
          scope.failure = true;
          return false;
        }
      };


    }
  };
});

var lizDropBoxes = angular.module('lizDropBoxes', ['factories']);

lizDropBoxes.directive('dropBoxes', function  (shuffleArrayFactory) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			audio: '@',
			description: '@'
		},
		templateUrl: '../views/activities/drop_boxes.html',
		link: function postLink(scope, element, attrs) {

			var opt = scope.options,
				chances = opt.chancesPerPhase; // posibilidades por fase

			scope.phases = opt.phases; // Fases del juego
			scope.dropTarget = null; // Padre en donde cae el objeto
			scope.remaining = []; // Objetos sobrantes
			scope.actualPhase = {}; // Fase Actual

			// variables de calificación
			scope.rightAnswer = false;
			scope.wrongAnswer = false;
			scope.success = false;

			// Constructor de remaining
			scope.phases.forEach(function(phase){
				phase.groups.forEach(function(group){
					// Creamos un objeto por cada uno de los items del grupo
					// mientras que los vamos eliminando del mismo array usando shift
					// Se deben diferenciar por phase y grupo
					while(group.items.length){
						scope.remaining.push({
							phase: phase.title,
							group: group.title,
							word: group.items.shift()
						})
					};
				});
			});

			// Se barajan los elementos
			shuffleArrayFactory.run(scope.remaining);

			// Se carga la fase actual
			scope.actualPhase = scope.phases.shift();

			// Opciones del sortable
			scope.sortableOptions = {
				connectWith: '.connected',
			};

			/**
			 * -----------------------------------------------------------------------------
			 * Verify
			 * -----------------------------------------------------------------------------
			 * Verifica la fase actual. Es la función principal de la actividad.
			 *
			 * Primero se buscan todos los elementos erróneos dentro de la fase actual, así
			 * como los elementos que no se hayan agregado. Después, si se han encontrado elementos
			 * entonces la respuesta es incorrecta, de lo contrario, es correcta y se carga la siguiente
			 * fase.
			 *
			 * La actividad termina cuando ya no hay más fáses.
			 */
			scope.verify = function () {
				var badAnswers = []; // puestos por error
				var missedItems = []; // objetos perdidos

				// ============================================================================
				// Búsqueda de elementos
				// ============================================================================
				// Recorremos cada group y comparamos los objetos adentro
				scope.actualPhase.groups.forEach(function(group){
					// Si aún hay objetos pendientes que van dentro de las casillas
					var missedInGroup = scope.remaining.filter(function(item){
						return item.phase === scope.actualPhase.title &&
							item.group === group.title;
					});

					// Concatenamos los objetos perdidos
					missedItems = missedItems.concat(missedInGroup);

					// Objetos no pertenecientes a la lista
					group.items.forEach(function(item){
						if(item.group !== group.title || item.phase !== scope.actualPhase.title){
							badAnswers.push(item)
						}
					});
				});

				// ============================================================================
				// Verificación de respuesta correcta/incorrecta
				// ============================================================================
				if(missedItems.length || badAnswers.length){
					// Respuesta Incorrecta
					scope.wrongAnswer = Math.random(); // Disparador de respuesta
					chances--;

					// Se debe reiniciar la serie si se acaban las posibilidades
					if(chances === 0){
						chances = opt.chancesPerPhase; // Reinicia el contador

						// Recorremos los grupos y eliminamos los elementos, añadiéndolos nuevamente a la
						// gran lista
						scope.actualPhase.groups.forEach(function(group){
							while(group.items.length){
								scope.remaining.push( group.items.shift() ); 
							};
						});
					}
				} else {
					// Respuesta Correcta
					scope.rightAnswer = Math.random(); // Disparador de respuesta
					chances = opt.chancesPerPhase; // Reinicia el contador

					// ============================================================================
					// Fin de la actividad
					// ============================================================================
					if(scope.phases.length === 0){
						scope.$root.isNextEnabled = true;
						scope.success = true;
					} else {
						scope.actualPhase = scope.phases.shift();
					}
				}

			};
			
		}
	}; 
});

/* ===========================================================
 * Drop Condition
 * ===========================================================
 * Permite arrastrar elementos a cuadros basado en una condición definida por medio de una función.
 */
var lizDropCondition = angular.module('lizDropCondition', ['ngDragDrop']);

lizDropCondition.directive('dropCondition', function  ($compile) {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      audio: '@',
      description: '@'
    },
    templateUrl: '../views/activities/drop_condition.html',
    link: function (scope, element, attrs) {
      var opt = scope.options,
        iTemplate = opt.itemTemplate,
        tTemplate = iTemplate.replace('item', 'target.model'), // Usa la misma plantilla de los items
        $itemsTemplate = null, // Plantilla de los objetos
        $targetsTemplate = null,
        chances = opt.chances,
        minRightAnswers = opt.minRightAnswers,
        rightAnswers = 0; // Contador de respuestas correctas

      // Models
      // --------------------------------------------------------------------
      scope.items = opt.items.slice(0);
      scope.targets = _.range(opt.targets).map(function () { return { drop: "true", model: {} }; });

      // Calificación
      scope.success = false;
      scope.failure = false;
      scope.wrongAnswer = false;

      // Template Configuration
      // --------------------------------------------------------------------
      $itemsTemplate = '<div ng-repeat="item in items" class="item" ng-show="item._showIf_" data-drag="true" data-jqyoui-options="{ revert: \'invalid\' }" ng-model="items"\n     jqyoui-draggable="{index: {{$index}} }">\n</div>\n'
      $itemsTemplate = $itemsTemplate.replace('_showIf_', opt.showIf);
      $itemsTemplate = angular.element($itemsTemplate);
      $itemsTemplate.append(iTemplate);

      $targetsTemplate = '<div class="targets">\n    <div class="target" ng-repeat="target in targets" data-drop="! target.completed" ng-model="target.model" jqyoui-droppable="{ onDrop: \'dropCallback(target)\' }"></div>\n</div>\n';
      $targetsTemplate = angular.element($targetsTemplate);
      $targetsTemplate.find('.target').append($compile(tTemplate)(scope));

      element.find('.items').append($compile($itemsTemplate)(scope));
      element.find('.targets-container').append($compile($targetsTemplate)(scope));


      // Callback
      // --------------------------------------------------------------------
      scope.dropCallback = function (event, ui, target) {
        var completedTargets = 0;

        // Revisamos el target utilizando la función personalizada
        if(opt.pass(target.model)) {
          // Respuesta correcta
          target.completed = true;
          rightAnswers += 1;
        } else {
          // Respuesta incorrecta: Devuelve a su posición inicial
          scope.items.push(target.model); // Devuelve a los items
          target.model = {}; // limpia el interno
          scope.wrongAnswer = Math.random();
        }

        chances -= 1;

        // Fin de la actividad
        completedTargets = scope.targets.filter(function (t) {
          return t.completed;
        }).length;

        if(completedTargets === scope.targets.length || chances === 0) {
          if(rightAnswers >= minRightAnswers) {
            scope.$root.isNextEnabled = true;
            scope.success = true;
          } else {
            scope.failure = true;
          }
        }
      };


    }
  };
});

var lizDropImageSample = angular.module('lizDropImageSample', []);

// Knockout Pairs Factory
lizDropImageSample.factory('dropImageSampleActivity', function ($rootScope, shuffleArrayFactory) {

	var dropImageSampleActivity = {};

	/**
	 * Crea el ViewModel
	 */
	dropImageSampleActivity.create = function (options) {
		return new dropImageSampleActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		opt						Opciones a utilizar.
	 *
	 *	target: Permite darle un orden apropiado a los targets. Debe empezar desde 0 y la propiedad opt.randomTargets debe estar desactivada
	 *
	 * @param {integer}		opt.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		opt.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {function}	opt.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	opt.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 *
	 */
	dropImageSampleActivity._ViewModel = function (opt) {
		var self = this;

		// Inicializa las opciones
		var	minRightAnswers = opt.minRightAnswers ? opt.minRightAnswers : opt.targets.length,
		chances = opt.chances ? opt.chances : opt.targets.length;

		self.items = ko.observableArray(shuffleArrayFactory.run(opt.targets)); // Elementos a lanzar 

		// Agregamos una propiedad _index a cada uno de los items para poder organizarlos de forma absoluta
		for(var i=0; i < self.items().length; i++){
			self.items()[i]._id = i;

			// extension de la imagen
			self.items()[i].extension = self.items()[i].hasOwnProperty('extension') ?  self.items()[i].extension : 'png' ;
		}

		self.targets = ko.observableArray(self.items().slice(0)); // copia a los targets, donde caerán los elementos

		self.canvas = opt.canvas;
		self.canvasAlt = opt.canvasAlt;

		self.sample = typeof opt.sample !== 'undefined' ? opt.sample : false;
		self.sampleAlt = typeof opt.sampleAlt !== 'undefined' ? opt.sampleAlt : false;

		// audio
		self.audio = ko.observable(opt.audio);

		self.itemsContainerHeight = opt.itemsContainerHeight; // Para darle un tamaño fijo al contenedor de items y no quede vacío

		// Carpeta de recursos desde angular
		self.resources = $rootScope.resources;

		self.maximumElements = 1; // IMPORTANTE: Requerido para que los sortables no acepten más de un elemento
		self.rightAnswers = 0; // Inicializamos el número de respuestas buenas a 0

		// Triggers que se activan cuando la respuesta es correcta/incorrecta
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
		self.failure = ko.observable(false);
		self.success = ko.observable(false);

		ko.utils.arrayForEach(self.targets(), function(target){
			target.sortable = ko.observableArray(); // Donde caen los elementos
			target.sortable._id = target._id; // Id de comparación
		});

		/**
		 * Reproduce el audio de la instrucción.
		 */
		self.playAudio = function () {
			$('#audio-instruction')[0].play();
		};

		// Define si el target esta lleno utilizando self.maximumElements
		self.isContainerFull = function (parent) {
			return parent().length < self.maximumElements;
		};

		// Función que se ejecuta cuando se suelta el elemento y hace toda la funcionalidad
		self.verifyAnswer = function (arg) {
			var parent = arg.targetParent,
			item = arg.item;


			// Compara el _id para encontrar la pareja idéntica. Si es igual, la respuesta es correcta
			if(parent._id === item.sortable._id){

				// RESPUESTA CORRECTA
				self.rightAnswers++;
				self.rightAnswer(item);

				// Si se definió una función cuando la respuesta es correcta, se corre
				if(typeof opt.rightAnswerCallback !== "undefined" ) opt.rightAnswerCallback(item);

			} else {

				// RESPUESTA INCORRECTA
				self.wrongAnswer(item);
				arg.cancelDrop = true;
			}

			// Reducimos en 1 las posibilidades
			chances--;

			// La actividad termina cuando el número de posibilidades se termina
			if(chances === 0 || self.rightAnswers === self.targets().length) {
				// Si el número de respuestas correctas es mayor o igual al requerido inicialmente
				if(self.rightAnswers >= minRightAnswers) {
					self.success(true); // Trigger de éxito

					// Se llama la función de éxito, definida por el desarrollador
					if (typeof opt.successCallback !== "undefined") opt.successCallback();

					$rootScope.isNextEnabled = true; // Activamos el siguiente
				} else {
					self.failure(true); // Trigger de fracaso
				}
			}
		};

		/**
		 * Devuelve los estilos de los elementos
		 */
		self.getItemStyles = function (item) {
			var styles = '';

			styles += "width: " + (100 / self.targets().length) + "%;";
			styles += "left: " + ((100 / self.targets().length) * item._id) + "%;";

			return styles;
		};

		/**
		 * Devuelve los estilos de los targets
		 */
		self.getTargetStyles = function (target) {
			var styles = '',
				pos = target.targetPos;

			styles += "width: " + pos.w + "%;";
			styles += "height: " + pos.h + "%;";
			styles += "top: " + pos.t + "%;";
			styles += "left: " + pos.l + "%;";

			return styles;
		};

		/**
		 * Devuelve los estilos de los targets
		 */
		self.getTargetInnerStyles = function (target) {
			var styles = '',
				pos = target.innerPos;

			styles += "width: " + pos.w + "%;";
			styles += "height: " + pos.h + "%;";

			// Usamos margin, debido a que el padre mide 0x0
			styles += "margin-top: " + pos.t + "%;"; 
			styles += "margin-left: " + pos.l + "%;";

			return styles;
		};


	};

	/**
	 * Inicializa la instancia del ViewModel creado con dropImageSampleActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	dropImageSampleActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return dropImageSampleActivity;

});

lizDropImageSample.directive('dropImageSample', function  (dropImageSampleActivity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			audio: '@',
			description: '@'
		},
		templateUrl: '../views/activities/drop_image_sample.html',
		link: function postLink(scope, element, attrs) {
			// Añadimos el audio a options
			scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;

			// Corremos la aplicación
			var vm = dropImageSampleActivity.create(scope.options);
			dropImageSampleActivity.run(vm);
		}
	}; 
});

var lizDropOut = angular.module('lizDropOut', []);

lizDropOut.factory('dropOutActivity', function ($rootScope) {
    
	var dropOutActivity = {};

	/**
	 * Crea el ViewModel
	 */
	dropOutActivity.create = function (options) {
		return new dropOutActivity._ViewModel(options);
	}

    /**
     * Genera el ViewModel de las parejas con sus funcionalidades
     *
     * Recibe un objeto con las siguientes propiedades
     *
     * @param {object}		options						Opciones a utilizar.
     *
     * @param {integer}		options.chances				Número de posibilidades que tiene el usuario de hacer la actividad
     * @param {integer}		options.minRightAnswers		Número mínimo de respuestas correctas
     * @param {function}	options.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
     * @param {function}	options.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
     *
      */
    dropOutActivity._ViewModel = function (options) {
        var self = this;

        // Variables para sortables
        self.items = ko.observableArray(options.items);
        self.outside = ko.observableArray();

		ko.utils.arrayForEach(self.items(), function (item) {
			if(! item.hasOwnProperty('answer')) item.answer = true;
		});

        // Ruta a la carpeta de imágenes
        self.resources = $rootScope.resources;

		// Disparador de preguntas correctas/incorrectas
        self.rightAnswer = ko.observable();
        self.wrongAnswer = ko.observable();

        self.success = ko.observable(false);
        self.failure = ko.observable(false);

        self.rightAnswers = 0;

        self.chances = options.chances ? options.chances : options.items.length;

        /**
         * Obtiene los estilos de cada elemento
         */
		self.getStyles = function (item) {
			var styles = '';

			styles += 'width: ' + item.w + '%;';
			styles += 'height: ' + item.h + '%;';
			styles += 'top: ' + item.t + '%;';
			styles += 'left: ' + item.l + '%;';

        	return styles;
        }

		/**
		 *	Función que se ejecuta al soltar el objeto dentro del contenedor
		 */
        self.verifyAnswer = function (arg) {

            // No hacer nada y salir de la función, si el elemento se soltó en el mismo grupo inicial
            if(arg.sourceParent() == arg.targetParent()) return;

            // Calculamos si la respuesta es correcta o no usando la propiedad 'answer'
            if (arg.item.answer) {
                // Respuesta correcta
                self.rightAnswer(arg.item);
                self.rightAnswers++;

                // Llama a la función de respuesta buena
				if (typeof options.rightAnswerCallback !== "undefined") options.rightAnswerCallback();

            } else {
                // Respuesta Incorrecta
                self.wrongAnswer(arg.item);
                arg.cancelDrop = true; // Devuelve el elemento a su posición origina
            }

            // Reducimos las posibilidades
            self.chances--;

            // Fin de la actividad
            if (self.chances === 0) {
                if(self.rightAnswers >= options.minRightAnswers) {
                    // éxito
                    self.success(true);

                    // Llama a la función de éxito
                    if (typeof options.successCallback !== "undefined") options.successCallback();

                    // Activamos la siguiente ruta
					$rootScope.isNextEnabled = true;
                } else {
                    // Fracaso
                    self.failure(true);
                }
            }
        };

    };

	/**
	 * Inicializa la instancia del ViewModel creado con dropOutActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
    dropOutActivity.run = function (instance) {
    	ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
    };

	return dropOutActivity;
});

lizDropOut.directive('dropOut', function  (dropOutActivity) {
    return {
        restrict: 'E',
		scope: {
			options: '=',
			description: '@'
		},
        templateUrl: '../views/activities/drop_out.html',
		link: function postLink(scope, element, attrs) {
			dropOutActivity.run(dropOutActivity.create(scope.options));
        }
    }; 
});


var lizGiraffe = angular.module('lizGiraffe', ['factories']);

lizGiraffe.directive('giraffe', function  (shuffleArrayFactory) {
	return {
		restrict: 'E',
		scope: {
			audio: '@',
			description: '@'
		},
		templateUrl: '../views/activities/giraffe.html',
		link: function postLink(scope, element, attrs) {

			// Vamos contando el número de respuestas incorrectas
			// Con el fin de tener una forma de reiniciar la tabla
			var wrongAnswers = 0; 

			scope.number = 0; // Número que se multiplica con el valor actual de la tabla
			scope.balloons = []; // Posibles respuestas
			scope.answers = []; // Array de respuestas. Usado para mostrar cuantas respuestas lleva

			// Si existe la sesión, se asigna a table
			if(sessionStorage.getItem('table')){
				scope.table = sessionStorage.getItem('table');
			} else {
				scope.table = 2; // Tabla actual
			}

			// Calificaciones
			scope.success = false;
			scope.failure = false;
			scope.rightAnswer = false;

			// Guardamos el número usando sessionStorage
			sessionStorage.setItem('table', scope.table);

			/**
			 * Genera la nueva operación.
			 */
			scope.generateOperation = function () {
				var balloonSeed = 0; // Usado para alimentar el array balloons

				scope.balloons.length = 0; // Reinicia el array

				// Fin de la actividad
				if(scope.number === 9 && scope.table === 9){
					scope.$root.isNextEnabled = true;
					scope.success = true;

					// Removemos el elemento de sessionStorage
					sessionStorage.removeItem('table'); // Actualiza sessionStorage
				}

				// Cuando llegue a ser 9, se reinicia a 0 y se cambia de tabla
				if(scope.number === 9){
					scope.rightAnswer = Math.random(); // Dispara el ícono de respuesta correcta
					scope.number = 0;
					scope.table++;
					wrongAnswers = 0; 
					sessionStorage.setItem('table', scope.table); // Actualiza sessionStorage

					// Reinicia las respuestas
					scope.answers.length = 0;
				}

				// Aumentamos el número en 1
				scope.number++;

				// Generamos inicialmente la respuesta y la añadimos
				scope.balloons.push({
					number: scope.table * scope.number
				});

				// Luego, añadimos otros 6 elementos, generados aleatoriamente
				for(var i = 0; i < 6; i++){
					// Generamos números, teniendo en cuenta que el número no puede
					// ser igual a la respuesta
					do{
						balloonSeed = Math.floor( Math.random() * (100 - 2) + 2 );
					} while(balloonSeed === scope.balloons[0].number);

					// Añadimos el elemento
					scope.balloons.push({ number: balloonSeed });
				}

				// Después, se baraja el array
				shuffleArrayFactory.run(scope.balloons);
				
			};

			// Generamos el primer valor a mostrar
			scope.generateOperation();

			/**
			 * Verifica la operación
			 */
			scope.verify = function (balloon) {

				if(balloon.number === scope.number * scope.table){
					// Respuesta Correcta
					scope.answers.push({
						right: true
					});
				} else {
					// Respuesta Incorrecta
					wrongAnswers++;

					scope.answers.push({
						right: false
					});
				}

				// Si tiene al menos 4 respuestas incorrectas, reinicia la actividad
				if(wrongAnswers === 4){
					scope.failure = true;
				}

				// Al final de la verificación, se genera nuevamente la operación
				scope.generateOperation();
			};

		}
	}; 
});

var lizGreaterLowerMat = angular.module('lizGreaterLowerMat', ['factories']);

lizGreaterLowerMat.factory('greaterLowerMatActivity', function ($rootScope, shuffleArrayFactory) {

	var greaterLowerMatActivity = {};

	/**
	 * Crea el ViewModel
	 */
	greaterLowerMatActivity.create = function (options) {
		return new greaterLowerMatActivity._ViewModel(options);
	};

	greaterLowerMatActivity._ViewModel = function (options) {
		var self = this,
			opt = options, // Alias de options
			newPair = {}, // Variable auxiliar para alimentar a self.numbers
			chances = opt.hasOwnProperty('chances') ? opt.chances : opt.numbers.length,
			minRightAnswers = opt.minRightAnswers;
		


		self.playAudio = function () {
			$('#audio-instruction')[0].play();
		};

		// Contantes para comparar
		var GREATER = 1,
			LOWER = 2;

		// Parejas de números
		self.numbers = ko.observableArray([]);

		// Símbolos a arrastrar
		self.greaterSymbol = ko.observable({ id: GREATER, symbol: 'Contando: 4, 6, 8;' });
		self.lowerSymbol = ko.observable({ id: LOWER, symbol: 'Contando: 4, 6, 8;' });

		// Constructor de las parejas de números
		opt.numbers.forEach(function(number){
			newPair = {
				sortable: ko.observableArray([]),
				left: number[0],
				right: number[1]
			};

			newPair.sortable.id = (number[0] > number[1]) ? GREATER : LOWER// tomamos en cuenta solamente si left es mayor a right
			self.numbers.push(newPair); // Añadimos al array
		});

		// Carpeta de recursos desde angular
		self.resources = $rootScope.resources;

		self.maximumElements = 1; // IMPORTANTE: Requerido para que los sortables no acepten más de un elemento
		self.rightAnswers = 0; // Inicializamos el número de respuestas buenas a 0

		// Triggers que se activan cuando la respuesta es correcta/incorrecta
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
		self.failure = ko.observable(false);
		self.success = ko.observable(false);

		// Define si el target esta lleno utilizando self.maximumElements
		self.isContainerFull = function (parent) {
			return parent().length < self.maximumElements;
		};
          

         

		// Función que se ejecuta cuando se suelta el elemento y hace toda la funcionalidad
		self.verifyAnswer = function (arg) {
			var parent = arg.targetParent,
			item = arg.item;

			if(parent.id === item.id){
				// RESPUESTA CORRECTA
				self.rightAnswers++;
				self.rightAnswer(item);

				// Si se definió una función cuando la respuesta es correcta, se corre
				if(typeof opt.rightAnswerCallback !== "undefined" ) opt.rightAnswerCallback(item);
			} else {
				// RESPUESTA INCORRECTA
				self.wrongAnswer(item);
			}

			// Reducimos en 1 las posibilidades
			chances--;

			// La actividad termina cuando el número de posibilidades se termina
			if(chances === 0) {
				// Si el número de respuestas correctas es mayor o igual al requerido inicialmente
				if(self.rightAnswers >= minRightAnswers) {
					self.success(true); // Trigger de éxito

					// Se llama la función de éxito, definida por el desarrollador
					if (typeof opt.successCallback !== "undefined") opt.successCallback();

					$rootScope.isNextEnabled = true; // Activamos el siguiente
				} else {
					self.failure(true); // Trigger de fracaso
				}
			}

		};

	};

	/**
	 * Inicializa la instancia del ViewModel creado con greaterLowerThanActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	greaterLowerMatActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return greaterLowerMatActivity;

});

lizGreaterLowerMat.directive('greaterLowerMat', function  (greaterLowerMatActivity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			description: '@',
			img: '@',
			alt: '@',
			audio:'@',
			theme: '@'

		},
		templateUrl: '../views/activities/greater_lower_mat.html',
		link: function postLink(scope, element, attrs) {
			// Corremos la aplicación
			var vm = greaterLowerMatActivity.create(scope.options);
			greaterLowerMatActivity.run(vm);

			attrs.$observe( 'theme', function(val) {
				if ( !angular.isDefined( val ) ) {
					scope.theme = 'default';
				}
			});
		}
	}; 
});

var lizGreaterLowerThan = angular.module('lizGreaterLowerThan', ['factories']);

lizGreaterLowerThan.factory('greaterLowerThanActivity', function ($rootScope, shuffleArrayFactory) {

	var greaterLowerThanActivity = {};

	/**
	 * Crea el ViewModel
	 */
	greaterLowerThanActivity.create = function (options) {
		return new greaterLowerThanActivity._ViewModel(options);
	};

	greaterLowerThanActivity._ViewModel = function (options) {
		var self = this,
			opt = options, // Alias de options
			newPair = {}, // Variable auxiliar para alimentar a self.numbers
			chances = opt.hasOwnProperty('chances') ? opt.chances : opt.numbers.length,
			minRightAnswers = opt.minRightAnswers;

		self.playAudio = function () {
			$('#audio-instruction')[0].play();
		};

		// Contantes para comparar
		var GREATER = 1,
			LOWER = 2;

		// Parejas de números
		self.numbers = ko.observableArray([]);

		// Símbolos a arrastrar
		self.greaterSymbol = ko.observable({ id: GREATER, symbol: '&gt;' });
		self.lowerSymbol = ko.observable({ id: LOWER, symbol: '&lt;' });

		// Constructor de las parejas de números
		opt.numbers.forEach(function(number){
			newPair = {
				sortable: ko.observableArray([]),
				left: number[0],
				right: number[1]
			};

			newPair.sortable.id = (number[0] > number[1]) ? GREATER : LOWER// tomamos en cuenta solamente si left es mayor a right
			self.numbers.push(newPair); // Añadimos al array
		});

		// Carpeta de recursos desde angular
		self.resources = $rootScope.resources;

		self.maximumElements = 1; // IMPORTANTE: Requerido para que los sortables no acepten más de un elemento
		self.rightAnswers = 0; // Inicializamos el número de respuestas buenas a 0

		// Triggers que se activan cuando la respuesta es correcta/incorrecta
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
		self.failure = ko.observable(false);
		self.success = ko.observable(false);

		// Define si el target esta lleno utilizando self.maximumElements
		self.isContainerFull = function (parent) {
			return parent().length < self.maximumElements;
		};


		// Función que se ejecuta cuando se suelta el elemento y hace toda la funcionalidad
		self.verifyAnswer = function (arg) {
			var parent = arg.targetParent,
			item = arg.item;

			if(parent.id === item.id){
				// RESPUESTA CORRECTA
				self.rightAnswers++;
				self.rightAnswer(item);

				// Si se definió una función cuando la respuesta es correcta, se corre
				if(typeof opt.rightAnswerCallback !== "undefined" ) opt.rightAnswerCallback(item);
			} else {
				// RESPUESTA INCORRECTA
				self.wrongAnswer(item);
			}

			// Reducimos en 1 las posibilidades
			chances--;

			// La actividad termina cuando el número de posibilidades se termina
			if(chances === 0) {
				// Si el número de respuestas correctas es mayor o igual al requerido inicialmente
				if(self.rightAnswers >= minRightAnswers) {
					self.success(true); // Trigger de éxito

					// Se llama la función de éxito, definida por el desarrollador
					if (typeof opt.successCallback !== "undefined") opt.successCallback();

					$rootScope.isNextEnabled = true; // Activamos el siguiente
				} else {
					self.failure(true); // Trigger de fracaso
				}
			}

		};

	};

	/**
	 * Inicializa la instancia del ViewModel creado con greaterLowerThanActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	greaterLowerThanActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return greaterLowerThanActivity;

});

lizGreaterLowerThan.directive('greaterLowerThan', function  (greaterLowerThanActivity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			description: '@',
			audio: '@'
		},
		templateUrl: '../views/activities/greater_lower_than.html',
		link: function postLink(scope, element, attrs) {
			// Corremos la aplicación
			var vm = greaterLowerThanActivity.create(scope.options);
			greaterLowerThanActivity.run(vm);
		}
	}; 
});

var lizGroupChoiceWords = angular.module('lizGroupChoiceWords', []);

lizGroupChoiceWords.directive('groupChoiceWords', function  (shuffleArrayFactory) {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_choice_words.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			titleBlock: '@',
			blockText: '@',
			style: '@',
			mainimg: '@',
			titletop:'@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.examples = scope.options.examples;
			scope.itemsrow = scope.options.itemsrow;
			scope.pattern = scope.items.pattern;
			scope.customClass = (scope.options.customClass) ? scope.options.customClass : "";
			scope.words = [];
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			random = scope.options.hasOwnProperty('random') ? scope.options.random : true; // Verdadero por defecto


			var items = scope.items;

		   // Constructor de palabras
		   for(var j=0; j < items.length; j++){

		   	var string = items[j].text;
			var words = string.split(" ");

			scope.items[j].words = [];
			
				
				for(var i=0; i < words.length; i++){

					if( scope.items[j].pattern.indexOf(i) > -1 ){
							
							if(random) shuffleArrayFactory.run(scope.items[j]["answers"+i]); // baraja
							scope.items[j]["answers"+i].unshift({
						          	text: "Elige una respuesta",
						          	default: true
							      });
							scope.items[j].words.push({
								  isInput: true,
							      chances: 2,
							      answers: scope.items[j]["answers"+i],
							      rightAnswer: scope.items[j]["answers"+i].filter(function (answer) {
							          return answer.answer;
						          })[0],
						          selectedAnswer: scope.items[j]["answers"+i][0] // elige la primera, en este caso, "elige una respuesta"
					      	});	
					      	 if(scope.items[j].hasOwnProperty('default')){
					      	 	item =  scope.items[j].words[i];
					      	 	  scope.rightAnswer = Math.random();
						          rightAnswers += 1;
						          item.right = true
						          item.wrong = false
						          item.completed = true;
						          item.selectedAnswer = item.rightAnswer;
						      }

					}else{
						scope.items[j].words.push({
								 isInput: false,
							     word: (words[i])
						});
					}

				}

			}


		/**
		 * Verifica si el input cumple con las condiciones del número 
		 */
		scope.verify = function (item,q) {
	        if(item.selectedAnswer.default) return; // Es "Elige una respuesta"

	        if(item.selectedAnswer.answer) {
	          scope.rightAnswer = Math.random();
	          rightAnswers += 1;
	          item.right = true
	          item.wrong = false
	          item.completed = true;
	        } else {
	          scope.wrongAnswer = Math.random();
	          item.chances -= 1;
	          item.right = false
	          item.wrong = true
	          if(item.chances === 0) {item.completed = true;q.callback = item.rightAnswer.text;}
	        }

	        // Contamos los elementos terminados
	        var questions = 0
	        var completedItems = 0
	        scope.items.forEach(function(q) {
			   q.words.forEach(function(w) {
			   		if(w.hasOwnProperty('answers')){
	        			questions ++
	          		};
			    	if(w.hasOwnProperty('completed')){
	        			completedItems ++
	          		};
				});
			});
	        
	        if(completedItems === questions) {
	          if(rightAnswers >= minRightAnswers) {
		          scope.$root.isNextEnabled = true;
		          scope.success = true;
		          return true;
		        }

		        scope.failure = true;
		        return false;
	        }
     	};



		}


    }; 
});


var lizGroupClassifyTable = angular.module('lizGroupClassifyTable', []);

lizGroupClassifyTable.directive('groupClassifyTable', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_classify_table.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			titleBlock: '@',
			blockText: '@',
			mainimg: '@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.list = scope.options.list;
			scope.words = [];
			scope.wordIn = false;
			scope.count = false;
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.itemsStyle = scope.options.itemsStyle;
			scope.success = false;
			scope.failure = false;
			scope.block = false;

			

			var items = scope.items;

		   // Constructor de palabras
		   for(var j=0; j < items.length; j++){

			   	var string = items[j].text;
				var words = string.split(" ");

				scope.items[j].words = [];

			
				
				for(var i=0; i < words.length; i++){

							scope.items[j].words.push({
								  isInput: true,
							      input: '',
							      word: (words[i]),
							});
				}

			}

			/**
			 * Verifica si el input cumple con las condiciones del número 
			 */
			
			scope.verify = function (item,word,pattern,items) {
				var chancesPerItem = 1
				if(word.wrong === true){chancesPerItem = 0}
				
					// Recorremos el grupo y sus items
			        pattern.forEach(function (wordx) {
			        	
			        	if(item === wordx.input && item != ''){
			        		scope.count ++
		          		}				      
					  
			        });			     

			      	if(scope.count >= 2){
	          			scope.wordIn = true
	          			scope.count = 0
	          		}else{scope.wordIn = false;scope.count = 0}

				if(item === '' || scope.wordIn === true) return; 
				
				// Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
				for(var i=0; i < pattern.length; i++){
					if( item.indexOf(pattern[i].word) > -1 ){
						rightAnswers++;
						chances--;
						word.wrong = false;
						word.right = true;
						word.completed = true; // marcamos el item como completo, para desactivar el input
						break
					} else {
						
						if(items.hasOwnProperty('answer2')){
							if(item === items.answer2){
								chances--;
								word.wrong = false;
								word.right = true;
								word.completed = true; // marcamos el item como completo, para desactivar el input
								break
							}else{
							       	word.right = false;
									word.wrong = true;
	                    		}
						}else {
						
							word.right = false;
							word.wrong = true;
                    	}
					}

				}
					
					if(word.wrong === true && chancesPerItem === 0){
						word.completed = true; // marcamos el item como completo, para desactivar el input
						chancesPerItem = 1
						chances--;
						item ="";
					}else{chancesPerItem = 0 ;}

					// fin de la actividad
					if(chances === 0){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} 
					
			}; // verify()



		}


    }; 
});


var lizGroupCompleteFreeConditions = angular.module('lizGroupCompleteFreeConditions', []);

lizGroupCompleteFreeConditions.directive('groupCompleteFreeConditions', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_complete_free_conditions.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			addicon: '@',
			instruction: '@'


		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.examples = scope.options.examples;
			scope.pattern = scope.items.pattern;
			scope.success = false;
			scope.failure = false;
			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow){
					styles += "width: " + (100 / scope.itemsPerRow) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-right: " + (10 / scope.itemsPerRow) + "%!important;";
				} else {
					styles += "width: " + (100 / scope.items.length) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
				}
				
				return styles;

				
			};

				
			/**
			 * Definimos nuestra función beforeGoNext para que muestre el cuadro de felicitaciones
			 */
			scope.$root.beforeGoNext = function () {
				scope.success = true;
				return true; 
			};
		   
			/**
			 * Verifica si el todos los inputs cumplen la longitud minima de caracteres 
			 */
			 
			scope.verify = function (item) {
				// Filtramos el array buscando los inputs que cumplen los requisitos y los contamos
				
			  
				   	var string = item.input;
					var words = string.split(" ");

					item.words = [];
					item.complete = [];
				
					
					for(var i=0; i < words.length; i++){

						if( item.pattern.indexOf(words[i]) > -1 ){
								item.words.push({
									  isInput: true,								      
								});
								

						} 

						else{
							
						}

					}

				


				// Si se han completado todos

				if ((item.words.length >= item.pattern.length || item.pattern[0] === "free" ) && item.input.length >= item.length) {

					/*item.complete.push({
									  complete: true,								      
								});*/
					item.wrong = false;
					item.right = true;
					var completedInputs = scope.items.filter(function(item){
						return item.right === true && item.input.length >= item.length;
					}).length;

					// Si se han completado todos
						if (completedInputs === scope.items.length) {
							scope.$root.isNextEnabled = true; // Activamos el siguiente vínculo
						} else {
							scope.$root.isNextEnabled = false; // Desactivamos el siguiente vínculo
						}	
				}else{
							if(item.right === true){
							item.right = false;
							item.wrong = true;}
							var completedInputs = scope.items.filter(function(item){
							return item.right === true && item.input.length >= item.length;
							}).length;

							// Si se han completado todos
								if (completedInputs === scope.items.length) {
									scope.$root.isNextEnabled = true; // Activamos el siguiente vínculo
								} else {
									scope.$root.isNextEnabled = false; // Desactivamos el siguiente vínculo
								}	
						}	

			}; // verify()

		}


    }; 
});


var lizGroupCompleteImages = angular.module('lizGroupCompleteImages', []);

lizGroupCompleteImages.directive('groupCompleteImages', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_complete_images.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			titleBlock: '@',
			blockText: '@',
			mainimg: '@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.pattern = scope.items.pattern;
			scope.images = scope.items.images;
			scope.words = [];
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow){
					styles += "width: " + (100 / scope.itemsPerRow) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-right: " + (10 / scope.itemsPerRow) + "%!important;";
				} else {
					styles += "width: " + (100 / scope.items.length) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
				}
				
				return styles;

				
			};

			var items = scope.items;

		   // Constructor de palabras
		   for(var j=0; j < items.length; j++){

		   	var x = -1
		   	var string = items[j].text;
			var words = string.split(" ");

			scope.items[j].words = [];

			
				
				for(var i=0; i < words.length; i++){
					if( scope.items[j].pattern.indexOf(i) > -1 ){
						x++
						console.log(x);
						if(scope.items[j].hasOwnProperty('answer2')){
							if(scope.items[j].answer2[x] !=''){
								scope.items[j].words.push({
									  isInput: true,
								      input: '',
								      word: (words[i]),
								      answer2: (scope.items[j].answer2[x]),
								      img: (scope.items[j].images[x])
								});
							}else{
							scope.items[j].words.push({
								  isInput: true,
							      input: '',
							      word: (words[i]),
							      img: (scope.items[j].images[x])
					      	});

						}

						}else{
							scope.items[j].words.push({
								  isInput: true,
							      input: '',
							      word: (words[i]),
							      img: (scope.items[j].images[x])
					      	});

						}

						console.log(scope.items[j].words);
					 

					} 

					else{
						scope.items[j].words.push({
								 isInput: false,
							     word: (words[i])
						});
					}

				}

			}

			/**
			 * Verifica si el input cumple con las condiciones del número 
			 */
			 var chancesPerItem = 1

			scope.verify = function (item) {
				if(item.input === '') return; 

				// Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
					if(item.input === item.word){
						rightAnswers++;
						chances--;
						item.wrong = false;
						item.right = true;
						item.completed = true; // marcamos el item como completo, para desactivar el input
					} else {
						
						if(item.hasOwnProperty('answer2')){
							
							if(item.input === item.answer2){
								rightAnswers++;
								chances--;
								item.wrong = false;
								item.right = true;
								item.completed = true; // marcamos el item como completo, para desactivar el input
							}else {
						
							item.wrong ? chancesPerItem = 0: chancesPerItem = 1;
							item.wrong = true;
							
									if(chancesPerItem === 0){
			                    	item.completed = true;
			                    	chances--;
			                    	chancesPerItem = 1;
			                    	}else{item.input="";}
                    	}

						}else {
						
							item.wrong ? chancesPerItem = 0: chancesPerItem = 1;
							item.wrong = true;
							
									if(chancesPerItem === 0){
			                    	item.completed = true;
			                    	chances--;
			                    	chancesPerItem = 1;
			                    	}else{item.input="";}
                    	}
					}

					
					

					// fin de la actividad
					if(chances === 0){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} 
					
			}; // verify()



		}


    }; 
});


var lizGroupCompleteLetters = angular.module('lizGroupCompleteLetters', []);

lizGroupCompleteLetters.directive('groupCompleteLetters', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_complete_letters.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			titleBlock: '@',
			blockText: '@',
			mainimg: '@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.chancesPerItem = scope.options.chancesPerItem ? scope.options.chancesPerItem : 1 ;
			scope.pattern = scope.items.pattern;
			scope.words = [];
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;

			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow){
					styles += "width: " + (96 / scope.itemsPerRow) + "%;";
					
				} 
				
				return styles;

				
			};

			
			var items = scope.items;

		   // Constructor de palabras
		   for(var j=0; j < items.length; j++){

		   	var string = items[j].text;
			var words = string.split(" ");

			scope.items[j].words = [];

			
				
				for(var i=0; i < words.length; i++){

					if( scope.items[j].pattern.indexOf(i) > -1 ){
						if(scope.items[j].hasOwnProperty('answer2')){
							scope.items[j].words.push({
								  isInput: true,
							      input: '',
							      word: (words[i]),
							      chances: (scope.chancesPerItem),
							      answer2: (scope.items[j].answer2)
							});
						}else{
							scope.items[j].words.push({
								  isInput: true,
							      input: '',
							      word: (words[i]),
							      chances: (scope.chancesPerItem)
					      	});

						}

					} 

					else{
						scope.items[j].words.push({
								 isInput: false,
							     word: (words[i])
						});
					}

				}

			}

			/**
			 * Verifica si el input cumple con las condiciones del número 
			 */
			 var chancesPerItem = 0

			scope.verify = function (item,group) {
				if(item.input === '') return; 

				// Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
					if(item.input === item.word){
						rightAnswers++;
						chances--;
						item.wrong = false;
						item.right = true;
						item.completed = true; // marcamos el item como completo, para desactivar el input
					} else {
						
						if(item.hasOwnProperty('answer2')){
							
							if(item.input === item.answer2){
								rightAnswers++;
								chances--;
								item.wrong = false;
								item.right = true;
								item.completed = true; // marcamos el item como completo, para desactivar el input
							}else {
								
							item.chances--
							item.wrong = true;
							
									if(item.chances === 0){
			                    	item.completed = true;
			                    	chances--;
			                    	chancesPerItem = 0;
			                    	group.feedback = typeof group.feedback !== "undefined" ? item.answer2 : group.feedback + ", " + item.answer2 ;
			                    	}else{item.input="";}
                    	}

						}else {
						
							item.chances--
							item.wrong = true;
							
									if(item.chances === 0){
			                    	item.completed = true;
			                    	chances--;
			                    	chancesPerItem = 0;
									group.feedback = typeof group.feedback === "undefined" ? item.word : group.feedback + ", " + item.word ;
			                    	}else{item.input="";}
                    	}
					}

					
					

					// fin de la actividad
					if(chances === 0){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} 
					
			}; // verify()



		}


    }; 
});


var lizGroupCompleteSound = angular.module('lizGroupCompleteSound', []);

lizGroupCompleteSound.directive('groupCompleteSound', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_complete_sound.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			addicon:'@' 
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.selectedItem = false; // elemento seleccionado
			scope.pattern = scope.items.pattern;
			scope.text = scope.items.text;
			minRightAnswers = scope.options.minRightAnswers;
			scope.nodisabled = scope.options.nodisabled;//desactiva el bloqueo del input
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			completedItems = 0;

			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow === 2){
					styles += "width: " + (98 / scope.itemsPerRow) + "%;";
				} 
				if (scope.itemsPerRow === 3) {
					styles += "width: " + (97 / scope.itemsPerRow) + "%;";
				}
				if (scope.itemsPerRow === 5) {
					styles += "width: " + (97 / scope.itemsPerRow) + "%;";
				}
				if (scope.itemsPerRow === 1) {
					styles += "width: " + (100 / scope.items.length) + "%;";
					/*styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";*/
				}
				
				return styles;

				
			};

			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles2 = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow === 2){
					styles += "width: 22%";
				} 
				if (scope.itemsPerRow === 3) {
					styles += "width: 35%";
					/*styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";*/
				}
				if (scope.itemsPerRow === 5) {
					styles += "width: 35%";
					/*styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";*/
				}
				if (scope.itemsPerRow === 1) {
					styles += "width: " + (100 / scope.items.length) + "%;";
					/*styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";*/
				}
				
				return styles;

				
			};
			/*margin-top: -7%;
			left: 44%;*/

			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles3 = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow === 2){
					styles += "width: 76%";
				}
				if (scope.itemsPerRow === 3) {
					styles += "width: 62%";
				}
				if (scope.itemsPerRow === 5) {
					styles += "width: 62%";
				}
				if (scope.itemsPerRow === 1) {
					styles += "width: " + (100 / scope.items.length) + "%;";
				}
				
				return styles;

				
			};
				
			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {

				scope.selectedItem = item; // seleccionamos el objeto

				// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === scope.items.length){
		
				}
			};
		   
			/**
			 * Verifica si el input cumple con las condiciones del número 
			 */
			 var chancesPerItem = 1


			scope.verify = function (item) {
				
				if((item.input === '' ) || ! item.hasOwnProperty('input')) return; 

				
					if ( (item.input === item.text) || (item.text === "free" && item.input.length >= item.length) || ( item.hasOwnProperty('answer2') && item.input === item.answer2 && item.input.length >= item.length) ){						
							
							if(!item.completed){
								rightAnswers++;
								chances--;
							}
							item.wrong = false;
							item.right = true;
							item.completed = true; // marcamos el item como completo, para desactivar el input
							
					} 
					else {
								
							item.wrong ? chancesPerItem = 0: chancesPerItem = 1;
							item.wrong = true;
							
								if(chancesPerItem === 0){
		                    	item.input = "La respuesta correcta es: " + item.text;
		                    	item.completed = true;
		                    	chances--;
		                    	chancesPerItem = 1;
		                    	}
		                    	else{item.input ="";}

					}

					// fin de la actividad
					if(chances === 0){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} 					
			}; // verify()

		}


    }; 
});


var lizGroupCompleteSounds = angular.module('lizGroupCompleteSounds', []);

lizGroupCompleteSounds.directive('groupCompleteSounds', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_complete_sounds.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			addicon:'@' 
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.selectedItem = false; // elemento seleccionado
			scope.pattern = scope.items.pattern;
			scope.text = scope.items.text;
			minRightAnswers = scope.options.minRightAnswers;
			scope.nodisabled = scope.options.nodisabled;//desactiva el bloqueo del input
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			completedItems = 0;

			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow === 2){
					styles += "width: " + (98 / scope.itemsPerRow) + "%;";
				} 
				if (scope.itemsPerRow === 3) {
					styles += "width: " + (97 / scope.itemsPerRow) + "%;";
				}
				if (scope.itemsPerRow === 5) {
					styles += "width: " + (97 / scope.itemsPerRow) + "%;";
				}
				if (scope.itemsPerRow === 1) {
					styles += "width: " + (100 / scope.items.length) + "%;";
					/*styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";*/
				}
				
				return styles;

				
			};

			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles2 = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow === 2){
					styles += "width: 22%";
				} 
				if (scope.itemsPerRow === 3) {
					styles += "width: 35%";
					/*styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";*/
				}
				if (scope.itemsPerRow === 5) {
					styles += "width: 35%";
					/*styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";*/
				}
				if (scope.itemsPerRow === 1) {
					styles += "width: " + (100 / scope.items.length) + "%;";
					/*styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";*/
				}
				
				return styles;

				
			};
			/*margin-top: -7%;
			left: 44%;*/

			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles3 = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow === 2){
					styles += "width: 76%";
				}
				if (scope.itemsPerRow === 3) {
					styles += "width: 62%";
				}
				if (scope.itemsPerRow === 5) {
					styles += "width: 62%";
				}
				if (scope.itemsPerRow === 1) {
					styles += "width: " + (100 / scope.items.length) + "%;";
				}
				
				return styles;

				
			};
				
			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {

				scope.selectedItem = item; // seleccionamos el objeto

				// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === scope.items.length){
		
				}
			};
		   
			/**
			 * Verifica si el input cumple con las condiciones del número 
			 */
			 var chancesPerItem = 1


			scope.verify = function (item) {
				
				if((item.input === '' ) || ! item.hasOwnProperty('input')) return; 

				
					if ( (item.input === item.text) || (item.text === "free" && item.input.length >= item.length) || ( item.hasOwnProperty('answer2') && item.input === item.answer2 && item.input.length >= item.length) ){						
							
							if(!item.completed){
								rightAnswers++;
								chances--;
							}
							item.wrong = false;
							item.right = true;
							item.completed = true; // marcamos el item como completo, para desactivar el input
							
					} 
					else {
								
							item.wrong ? chancesPerItem = 0: chancesPerItem = 1;
							item.wrong = true;
							
								if(chancesPerItem === 0){
		                    	item.input = "La respuesta correcta es: " + item.text;
		                    	item.completed = true;
		                    	chances--;
		                    	chancesPerItem = 1;
		                    	}
		                    	else{item.input ="";}

					}

					// fin de la actividad
					if(chances === 0){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} 					
			}; // verify()

		}


    }; 
});


var lizGroupCompleteText = angular.module('lizGroupCompleteText', []);

lizGroupCompleteText.directive('groupCompleteText', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_complete_text.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.pattern = scope.items.pattern;
			scope.text = scope.items.text;
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			chancesPerItem = scope.options.chancesPerItem ? scope.options.chancesPerItem : 1
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow){
					styles += "width: " + (100 / scope.itemsPerRow) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-right: " + (10 / scope.itemsPerRow) + "%!important;";
				} else {
					styles += "width: " + (100 / scope.items.length) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
				}
				
				return styles;

				
			};

				

		   
			/**
			 * Verifica si el input cumple con las condiciones del número 
			 */
			scope.verify = function (item) {
				
				if((item.input === '' ) || ! item.hasOwnProperty('input')) return; 

				

					if (item.input === item.text || (item.hasOwnProperty('answer2') && item.input === item.answer2)){						
							rightAnswers++;
							chances--;
							item.wrong = false;
							item.right = true;
							item.completed = true; // marcamos el item como completo, para desactivar el input
							
					} 
					else {
							item.wrong ? chancesPerItem = scope.options.chancesPerItem ? scope.options.chancesPerItem - 1 : chancesPerItem = 1 : chancesPerItem = scope.options.chancesPerItem ? scope.options.chancesPerItem : chancesPerItem = 1 ;
							chancesPerItem--	
							item.wrong = true;
							
								if(chancesPerItem === 0){
		                    	item.completed = true;
		                    	chances--;
		                    	chancesPerItem = scope.options.chancesPerItem ? scope.options.chancesPerItem : 1
		                    	}
		                    	else{item.input="";}

					}

					// fin de la actividad
					if(chances === 0){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} 					
			}; // verify()

		}


    }; 
});


var lizGroupCompleteTextFree = angular.module('lizGroupCompleteTextFree', []);

lizGroupCompleteTextFree.directive('groupCompleteTextFree', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_complete_text_free.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			titleBlock: '@',
			blockText: '@',
			mainimg: '@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.pattern = scope.items.pattern;
			scope.text = scope.items.text;
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow){
					styles += "width: " + (100 / scope.itemsPerRow) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-right: " + (10 / scope.itemsPerRow) + "%!important;";
				} else {
					styles += "width: " + (100 / scope.items.length) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
				}
				
				return styles;

				
			};

				
			/**
			 * Definimos nuestra función beforeGoNext para que muestre el cuadro de felicitaciones
			 */
			scope.$root.beforeGoNext = function () {
				scope.success = true;
				return true; 
			};
		   
			/**
			 * Verifica si el todos los inputs cumplen la longitud minima de caracteres 
			 */
			 
			scope.verify = function (item) {
				// Filtramos el array buscando los inputs que cumplen los requisitos y los contamos
				
				var completedInputs = scope.items.filter(function(item){
					return item.input.length >= item.length && item.input;
				}).length;

				// Si se han completado todos
				if (completedInputs === scope.items.length) {
					scope.$root.isNextEnabled = true; // Activamos el siguiente vínculo
				} else {
					scope.$root.isNextEnabled = false; // Desactivamos el siguiente vínculo
				}	
			}; // verify()

		}


    }; 
});


var lizGroupCompleteWords = angular.module('lizGroupCompleteWords', []);

lizGroupCompleteWords.directive('groupCompleteWords', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_complete_words.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			titleBlock: '@',
			blockText: '@',
			style: '@',
			mainimg: '@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.examples = scope.options.examples;
			scope.itemsrow = scope.options.itemsrow;
			scope.pattern = scope.items.pattern;
			scope.customClass = (scope.options.customClass) ? scope.options.customClass : "";
			scope.words = [];
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;

			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function () {
				var styles = "";

				if(scope.itemsPerRow){
					styles += "width: " + (100 / scope.itemsPerRow) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-right: " + (10 / scope.itemsPerRow) + "%!important;";
				} else {
					styles += "width: " + (100 / scope.items.length) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
				}
				styles += "float: left;";
				
				return styles;

				
			};

			var items = scope.items;

		   // Constructor de palabras
		   for(var j=0; j < items.length; j++){

		   	var string = items[j].text;
			var words = string.split(" ");

			scope.items[j].words = [];

			
				
				for(var i=0; i < words.length; i++){

					if( scope.items[j].pattern.indexOf(i) > -1 ){
						if(scope.items[j].hasOwnProperty('answer2')){
							scope.items[j].words.push({
								  isInput: true,
							      input: '',
							      word: (words[i]),
							      answer2: (scope.items[j].answer2)
							});
						}else{
							scope.items[j].words.push({
								  isInput: true,
							      input: '',
							      word: (words[i])
					      	});

						}
					 

					} 

					else{
						scope.items[j].words.push({
								 isInput: false,
							     word: (words[i])
						});
					}

				}

			}

			/**
			 * Verifica si el input cumple con las condiciones del número 
			 */
			 var chancesPerItem = 
			 		(scope.options.hasOwnProperty("chancesPerItem")) ? scope.options.chancesPerItem : 1;

			scope.verify = function (item,q) {
				if(item.input === '') return; 

				// Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
					if(item.input.toLowerCase() === item.word.toLowerCase()){
						rightAnswers++;
						chances--;
						item.wrong = false;
						item.right = true;
						item.completed = true; // marcamos el item como completo, para desactivar el input
					} else {
						
						if(item.hasOwnProperty('answer2')){
							
							if(item.input.toLowerCase() === item.answer2.toLowerCase()){
								rightAnswers++;
								chances--;
								item.wrong = false;
								item.right = true;
								item.completed = true; // marcamos el item como completo, para desactivar el input
							}else {
						
							item.wrong ? chancesPerItem = 0: chancesPerItem = 1;
							item.wrong = true;
							
									if(chancesPerItem === 0){
			                    	item.completed = true;
			                    	item.input = item.word;
			                    	q.callback = item.answer2 ? 'Las respuestas correctas son: ' + item.word + ' Ó ' + item.answer2 : 'La respuesta correcta es: ' + item.word;
			                    	chances--;
			                    	chancesPerItem = (scope.options.hasOwnProperty("chancesPerItem")) ? scope.options.chancesPerItem : 1;;
			                    	}else{item.input="";}
                    	}

						}else {
						
							item.wrong ? chancesPerItem = 0: chancesPerItem = 1;
							item.wrong = true;
							
									if(chancesPerItem === 0){
			                    	item.completed = true;
			                    	item.input = item.word;
			                    	q.callback = item.answer2 ? 'Las respuestas correctas son: ' + item.word + ' Ó ' + item.answer2 : 'La respuesta correcta es: ' + item.word;
			                    	chances--;
			                    	chancesPerItem = (scope.options.hasOwnProperty("chancesPerItem")) ? scope.options.chancesPerItem : 1;;
			                    	}else{item.input="";}
                    	}
					}

					
					

					// fin de la actividad
					if(chances === 0){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} 
					
			}; // verify()



		}


    }; 
});


var lizGroupCompleteYesNot = angular.module('lizGroupCompleteYesNot', []);

lizGroupCompleteYesNot.directive('groupCompleteYesNot', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_complete_yes_not.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.pattern = scope.items.pattern;
			scope.text = scope.items.text;
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow){
					styles += "width: " + (100 / scope.itemsPerRow) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-right: " + (10 / scope.itemsPerRow) + "%!important;";
				} else {
					styles += "width: " + (100 / scope.items.length) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
				}
				
				return styles;

				
			};

				

		   
			/**
			 * Verifica si el input cumple con las condiciones del número 
			 */
			 var chancesPerItem = 0


			scope.verify = function (item) {console.log(item.input)
				
				if((item.input === '' ) || ! item.hasOwnProperty('input')) return; 

				

					if (item.input === item.text){						
							rightAnswers++;
							chances--;
							item.wrong = false;
							item.right = true;
							item.completed = true; // marcamos el item como completo, para desactivar el input
							
					} 
					else {
								
							item.wrong ? chancesPerItem = 0: chancesPerItem = 0;
							item.wrong = true;
							
								if(chancesPerItem === 0){
		                    	item.completed = true;
		                    	chances--;
		                    	chancesPerItem = 0;
		                    	}
		                    	else{item.input="";}

					}

					// fin de la actividad
					if(chances === 0){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} 					
			}; // verify()

		}


    }; 
});


var lizGroupInputs = angular.module('lizGroupInputs', ['factories']);

lizGroupInputs.directive('groupInputs', function  (shuffleArrayFactory) {

	return {
		restrict: 'E',
		scope: {
			options: '=',
			audio: '@',
			description: '@',
			mainimg: '@',
			mainalt: '@',
			maintitle: '@'
		},
		templateUrl: '../views/activities/group_inputs.html',
		link: function (scope, element, attrs) {
			var opt = scope.options, // Alias de options
				tempInput = {}, // variable temporal para la creación de inputs
				countInputs = 0, // número total de inputs
				inputsArray = []; // array usado para tener una referencia de todos los inputs 

			scope.groups = opt.groups;
			scope.hasExample = (opt.hasExample) ? true : false;

			// Creamos un array para hacer el foreach en cada grupo, basado en el número de inputs
			// Por otro lado, insertamos el mismo elemento en un array donde estarán todos los inputs
			// con el fin de filtrarlo posteriormente
			scope.groups.forEach(function(group){
				group.inputs = [];

				countInputs += group.numInputs; // Contamos los inputs

				for(var i = 0; i < group.numInputs; i++){
                    if  (i === 0) {
                        var example = (group.example) ? group.example : "";
                        tempInput = { value: '', example: example }; // Creamos un nuevo objeto a insertar
                    } else {
                        tempInput = { value: '' }; // Creamos un nuevo objeto a insertar
                    }
					group.inputs.push(tempInput); // inserta el input en su grupo respectivo
					inputsArray.push(tempInput); // inserta el input en el array general
				}

			});

			/**
			 * Definimos nuestra función beforeGoNext para que muestre el cuadro de felicitaciones
			 */
			scope.$root.beforeGoNext = function () {
				scope.success = true;
				return true; 
			};

            scope.checkHasExample = function (index, input) {
                if (index === 0 && scope.hasExample) {
                    input.value = scope.example;
                    return true;
                }

                return false;
            };

			/**
			 * Verifica el estado actual de los inputs para definir el final de la actividad
			 */
			scope.verify = function (input) {
				// Filtramos el array buscando los inputs que cumplen los requisitos y los contamos
				var completedInputs = inputsArray.filter(function(item){
					return item.value !== '' && !/[\d]/.test(input.value);
				}).length;
				// Si se han completado todos
				if (completedInputs === countInputs) {
					scope.$root.isNextEnabled = true; // Activamos el siguiente vínculo
				} else {
					scope.$root.isNextEnabled = false; // Desactivamos el siguiente vínculo
				}
				
			};

		}
	}; 

});

var lizGroupPuzzleWord = angular.module('lizGroupPuzzleWord', ['ngDragDrop']);

lizGroupPuzzleWord.directive('groupPuzzleWord', function  ($compile) {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      audio: '@',
      description: '@'
    },
    templateUrl: '../views/activities/group_puzzle_word.html',
    link: function (scope, element, attrs) {
      var opt = scope.options,
        replaceArray = [], // array con los índices de los targets
        targetCounter = 0, // Variable temporal usada como contador
        rightAnswers = 0, // contador de respuestas correctas
        minRightAnswers = opt.minRightAnswers, // respuestas correctas mínimas para pasar
        template = opt.template;

      // Models
      // --------------------------------------------------------------------
      scope.groups = opt.groups;
      scope.itemsPerRow = opt.itemsPerRow;
      scope.preserveOriginal = opt.preserveOriginal;

      scope.groups.forEach(function (g,index) {
        g.id = index;
        g.itemsAux = [];
        g.targets = [];
        g.rightAnswers = 0;

        for(var i=0; i < g.items.length; i++){
          targetCounter++ //incrementamos el contador para saber cuantos targets hay en total 

            // Creación de item y target
            g.itemsAux.push({
              text: g.items[i],
              drag: true,
            });

            g.targets.push({
              drop: true,
              textAccept: (g.items[(i === 0 ? 1 : 0)]),
              accept: g.id,
              chances: 1,
              model: {} // droppable
            });

            /**
            * auqui se busca la propiedad default en el grupo para completarlo y sea el ejemplo de la actividad.
            */
            if(g.default){

              // Respuesta correcta
              g.targets[i].model.text = g.items[(i === 0 ? 1 : 0)];
              g.targets[i].drop = false; // deshabilita el drop
              g.targets[i].disabled = true;
              g.targets[i].right = true;
              g.rightAnswers++
              if(g.rightAnswers === g.items.length){
                rightAnswers += 1;
              }

               g.itemsAux[i].drag = false

            }


        };

        g.items = g.itemsAux;
      });

      
      scope.dropCallback = function (e, ui, target,group) {
        var completedTargets = 0;
        // revisa el modelo interno y compara
        if(target.model.text === target.textAccept) {

          // Respuesta correcta
          target.drop = false; // deshabilita el drop
          target.disabled = true;
          target.wrong = false;
          target.right = true;
          group.rightAnswers++
          if(group.rightAnswers === group.items.length){
            rightAnswers += 1;
          }
          group.items.forEach(function (i) {
              if(i.text === target.model.text){i.drag = false}
          });
        } else {
          // Respuesta incorrecta
          target.chances -= 1;

          if(target.chances === 0) {
            group.items.forEach(function (i) {
                if(i.text === target.model.text){i.drag = false}
            });
            target.model = {}; // limpia el interno
            target.disabled = true;
            target.wrong = true;
          }
        }

        // Fin de la actividad
        scope.groups.forEach(function (g) {
            g.items.forEach(function (i) {
                  if(i.drag === false){completedTargets++}
            });
        });


        if(completedTargets === targetCounter) {
          scope.$root.isNextEnabled = true;
        }
      };

      scope.stopCallback = function (e, ui, item,group) {
       
      }

      /**
       * Función que se ejecuta al dar click en la flecha de siguiente.
       */
      scope.$root.beforeGoNext = function () {
        if(rightAnswers >= minRightAnswers) {
          scope.success = true;
          return true;
        } else {
          scope.failure = true;
          return true;
        }
      };


    }
  };
});

var lizGroupSelectMultiplesWords = angular.module('lizGroupSelectMultiplesWords', []);

lizGroupSelectMultiplesWords.directive('groupSelectMultiplesWords', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_select_multiples_words.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			titleBlock: '@',
			blockText: '@',
			style: '@',
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.images = scope.options.images;
			scope.chancesPerItem = scope.options.chancesPerItem;
			scope.itemswidth = scope.options.itemswidth ? scope.options.itemswidth : '100%' ;
			scope.examples = scope.options.examples;
			scope.pattern = scope.items.pattern;
			scope.words = [];
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;

			var items = scope.items;

		   	// Constructor de palabras
		   	for(var j=0; j < items.length; j++){

			   	var string = items[j].text;
				var words = string.split(" ");

				scope.items[j].words = [];

			
				
				for(var i=0; i < words.length; i++){

					if( scope.items[j].pattern.indexOf(i) > -1 ){
						scope.items[j].words.push({
							  isInput: true,
						      input: '',
						      word: (words[i])
				      	});					 

					} 
					else{
						scope.items[j].words.push({
								 isInput: false,
							     word: (words[i])
						});
					}

				}

			}

			/**
			 * Verifica si el input cumple con las condiciones del número 
			 */
			 var chancesPerItem = 1

			scope.verify = function (item,group) {
				if(group.hasOwnProperty('isCompleted')) return; 
				
				// Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
					if(item.isInput === true){
						
						rightAnswers++;
						item.wrong = false;
						item.right = true;
						item.completed = true; // marcamos el item como completo, para desactivar el input

						if(!group.hasOwnProperty('rightAnswers')){
		                    			group.rightAnswers = 1;
                		}else{group.rightAnswers += 1;}        

						if(group.rightAnswers === group.pattern.length){
	                    	group.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
	                    	group.right = true
	                    	chances--;
	                    }				
						
					} else {
							
							if(!group.hasOwnProperty('chances')){
	                    			group.chances = 1;
                    		}else{group.chances += 1;}

							if(group.chances === scope.chancesPerItem){
		                    	group.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
		                    	chances--;
		                    	group.wrong = true
	                    	}
	                    	
                			item.wrong = true;
							item.right = false;              	
					}

					
					

					// fin de la actividad
					if(chances === 0){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} 
					
			}; // verify()



		}


    }; 
});


var lizGroupSelectWords = angular.module('lizGroupSelectWords', []);

lizGroupSelectWords.directive('groupSelectWords', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_select_words.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@'
			
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.pattern = scope.items.pattern;
			scope.answer2 = scope.items.answer2;
			scope.selectedItem = false; // elemento seleccionado
			scope.selectedItem2 = false; // elemento seleccionado
			scope.selectedItemAux = false; // elemento seleccionado
			scope.words = [];
			scope.words.word = [];
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			completedItems = 0;
			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow){
					styles += "width: " + (100 / scope.itemsPerRow) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-right: " + (10 / scope.itemsPerRow) + "%!important;";
				} else {
					styles += "width: " + (100 / scope.items.length) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
				}
				
				return styles;

				
			};

			var items = scope.items;

		   // Constructor de palabras
		   for(var j=0; j < items.length; j++){

		   	var counter = 0;
		   	var string = items[j].text;
			var words = string.split(" ");

			scope.items[j].words = [];

			
				
				for(var i=0; i < words.length; i++){

					if( scope.items[j].pattern.indexOf(i) > -1 ){
						if(scope.items[j].answer2[i]!=""){
							scope.items[j].words.push({
								  isInput: true,
							      input: (words[i]),
							      word: (words[i]),
							      answer2: (scope.items[j].answer2[counter])
							});
							counter++
						}else{
							scope.items[j].words.push({
								  isInput: true,
							      input: (words[i]),
							      word: (words[i])
					      	});

						}
					 

					} 

					else{
						scope.items[j].words.push({
								 isInput: false,
							     word: (words[i])
						});
					}

				}

			}

			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {
				console.log(scope.selectedItem2);
				scope.selectedItemAux.select = [];
				scope.selectedItem = item; // seleccionamos el objeto
				scope.selectedItem.select = [];
				
			};

			/**
			 * Selecciona el objetivo indicado
			 */
			scope.selectItem2 = function (item) {
				console.log(item);
				console.log(scope.selectedItem);
			if(scope.selectedItem === false ) return;

				scope.selectedItemAux = item; // seleccionamos el objeto

				if (scope.selectedItem.word === scope.selectedItemAux.word){
						scope.selectedItem2 = item;
						item.word = [];
						item.word.right = true;		
					
						// Contamos los elementos completos
						if(!item.hasOwnProperty('isCompleted')){
							item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
							completedItems++;
							rightAnswers++
						}
					

				}else{
					
					item.select = [];
					item.select.wrong = true;

					if(scope.selectedItem.word.wrong === true){
						// Contamos los elementos completos
						if(!scope.selectedItem.hasOwnProperty('isCompleted')){
							
							completedItems++;
							scope.selectedItem.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
							scope.selectedItem = false; // elemento seleccionado
							
						}
					}else{
						scope.selectedItem.word = [];
						scope.selectedItem.word.wrong = true;
						scope.selectedItem = false; // elemento seleccionado
						
					}
				}


				// Fin de la actividad
				if(completedItems === chances){

					if (rightAnswers >= minRightAnswers){
						scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
				}

				
			};	

			scope.random = function(){
    			return 0.5 - Math.random();
			};	

		}

		


    }; 
});




var lizGroupTableCompleteWords = angular.module('lizGroupTableCompleteWords', []);

lizGroupTableCompleteWords.directive('groupTableCompleteWords', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_table_complete_words.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			altimg: '@',
			style: '@',
			mainimg: '@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.examples = scope.options.examples;
			scope.pattern = scope.items.pattern;
			scope.customClass = (scope.options.customClass) ? scope.options.customClass : "";
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;

			// Empezamos a recorrer todas las palabras y sumando
				scope.items.forEach(function(item){
					item.input = '';
				});

			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function () {
				var styles = "";

				if(scope.itemsPerRow){
					styles += "width: " + (100 / scope.itemsPerRow) + "%;";
					
				} else {
					styles += "width: " + (100 / 3) + "%;";
					
				}
								
				return styles;

				
			};

			/**
			 * Definimos nuestra función beforeGoNext para que muestre el cuadro de felicitaciones
			 */
			scope.$root.beforeGoNext = function () {

				var completedInputs = scope.items.filter(function(item){
							return item.right === true;
							}).length;
				if(completedInputs >= minRightAnswers){
					scope.success = true;
					return true; 
				}else{
					scope.failure = true;
					return true; 
				}
			};

			
			/**
			 * Verifica si el input cumple con las condiciones del número 
			 */

			scope.verify = function () {

				// Empezamos a recorrer todas las palabras y sumando
				scope.items.forEach(function(item){

					if (item.input === item.answer){

						item.completed = true;
						item.right = true;
						item.wrong = false;
					}else{

						item.completed = true;
						item.right = false;
						item.wrong = true;

					}

					console.log(item);
				});	

				scope.$root.isNextEnabled = true; // Activamos el siguiente vínculo		
					
			}; // verify()



		}


    }; 
});


var lizGroupTableTextConditions = angular.module('lizGroupTableTextConditions', []);

lizGroupTableTextConditions.directive('groupTableTextConditions', function  ($sce) {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_table_text_conditions.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			blockText: '@',
			mainimg: '@',
			addicon: '@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.titles = scope.options.titles;
			scope.chancesPerItem = scope.options.chancesPerItem;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.minRightAnswers = scope.options.minRightAnswers;
			scope.pattern = scope.items.pattern ? scope.items.pattern : ['N/A'];
			scope.options = scope.items.options ? scope.items.options : [];
			scope.text = scope.items.text;
			rightAnswers = 0, // Contador de preguntas buenas
			scope.success = false;
			scope.failure = false;

			// Recorremos todos los items
			if(scope.chancesPerItem){
		        scope.items.forEach(function (item) {
		          // agregamos cada item el numero de oportunidades

		          item.chances = scope.chancesPerItem						      
				  
		        });
		      }
			
			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(rows) {
				var styles = "";
				

				if(rows === undefined ){
					styles += "height: " + (108) + "px;";
					
				} 
				else{
					styles += "height: " + (40 * rows) + "px;";
					styles += "padding-top: " + (5 * rows) + "px;";
				}
				
				
				return styles;

				
			};

			// Para usar el html en angular
		      scope.sanitize = function (item) {
		        return $sce.trustAsHtml(item);
		      }

				
			/**
			 * Definimos nuestra función beforeGoNext para que muestre el cuadro de felicitaciones
			 */
			scope.$root.beforeGoNext = function () {

				var completedItems = 0 + scope.items.filter(function(item){
							return item.right === true ;
						}).length;

				if(completedItems >= scope.minRightAnswers){
					scope.success = true;
				}else{scope.failure = true;}
				return true; 
			};
		   
			/**
			 * Verifica si el todos los inputs cumplen la longitud minima de caracteres 
			 */
			 
			scope.verify = function (item) {
				if(item.input === '' || !item.hasOwnProperty('input') ){return}
				// Filtramos el array buscando los inputs que cumplen los requisitos y los contamos
				
			  
				   	var string = item.input;
					var words = string.split(" ");

					item.words = [];
					item.complete = [];
				

					for(var i=0; i < words.length; i++){

						if(item.hasOwnProperty('pattern')){

							if( item.pattern.indexOf(words[i]) > -1 ){
									item.words.push({
										  isInput: true,								      
									});
									

							} 
						}else{

							if( item.options.indexOf(words[i]) > -1 ){
									item.words.push({
										  isInput: true,								      
									});
									

							} 
						}
							

					}

				


				// Si se han completado todos
				if(item.hasOwnProperty('pattern')){
				
					if ( item.words.length >= item.pattern.length || item.pattern[0] === "free" && item.input.length >= item.length) {

						
						item.wrong = false;
						item.right = true;
						if(scope.chancesPerItem){item.completed = true};

						var completedInputs = scope.items.filter(function(item){
							return (item.right === true || item.completed === true ) && item.input.length >= item.length;
						}).length;

						// Si se han completado todos
							if (completedInputs === scope.items.length) {
								scope.$root.isNextEnabled = true; // Activamos el siguiente vínculo
							} else {
								scope.$root.isNextEnabled = false; // Desactivamos el siguiente vínculo
							}	
					}else{		
								if(scope.chancesPerItem){
									item.right = false;
									item.wrong = true;
									item.chances -= 1
									if(item.chances === 0){item.completed = true;item.input = item.pattern }
								};

								if(item.right === true){
									item.right = false;
									item.wrong = true;
								}

								var completedInputs = scope.items.filter(function(item){
								return (item.right === true || item.completed === true ) && item.input.length >= item.length;
								}).length;

								// Si se han completado todos
									if (completedInputs === scope.items.length) {
										scope.$root.isNextEnabled = true; // Activamos el siguiente vínculo
									} else {
										scope.$root.isNextEnabled = false; // Desactivamos el siguiente vínculo
									}	
							}
				}else{

					if ( (item.words.length >= 1 && item.hasOwnProperty('options') ) && item.input.length >= item.length) {

						
						item.wrong = false;
						item.right = true;
						var completedInputs = scope.items.filter(function(item){
							return item.right === true && item.input.length >= item.length;
						}).length;

						// Si se han completado todos
							if (completedInputs === scope.items.length) {
								scope.$root.isNextEnabled = true; // Activamos el siguiente vínculo
							} else {
								scope.$root.isNextEnabled = false; // Desactivamos el siguiente vínculo
							}	
					}else{
								if(item.right === true){
								item.right = false;
								item.wrong = true;}
								var completedInputs = scope.items.filter(function(item){
								return item.right === true && item.input.length >= item.length;
								}).length;

								// Si se han completado todos
									if (completedInputs === scope.items.length) {
										scope.$root.isNextEnabled = true; // Activamos el siguiente vínculo
									} else {
										scope.$root.isNextEnabled = false; // Desactivamos el siguiente vínculo
									}	
							}
				}	

			}; // verify()

		}


    }; 
});


var lizGroupTableTextConditionsOptions = angular.module('lizGroupTableTextConditionsOptions', []);

lizGroupTableTextConditionsOptions.directive('groupTableTextConditionsOptions', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_table_text_conditions_options.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			addicon: '@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.groups = scope.options.groups;
			scope.items = [];
			/*scope.itemsPerRow = scope.options.itemsPerRow;
			scope.pattern = scope.groups.items.pattern ? scope.groups.items.pattern : ['N/A'];
			scope.options = scope.groupsitems.options ? scope.groupsitems.options : [];*/
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			
			// Recorremos todas las grupos y sus items
			      scope.groups.forEach(function (group) {
			        group.items.forEach(function (item) {
			          // agregamos cada item a el array de items
			          scope.items.push({
							item: item,								      
					  });

			        });
			      });
			
			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(rows) {
				var styles = "";
				

				if(rows === undefined ){
					styles += "height: " + (108) + "px;";
					
				} 
				else{
					styles += "height: " + (40 * rows) + "px;";
					styles += "padding-top: " + (5 * rows) + "px;";
				}
				
				
				return styles;

				
			};
	
			/**
			 * Definimos nuestra función beforeGoNext para que muestre el cuadro de felicitaciones
			 */
			scope.$root.beforeGoNext = function () {
				scope.success = true;
				return true; 
			};
		   
			/**
			 * Verifica si el todos los inputs cumplen la longitud minima de caracteres 
			 */
			 
			scope.verify = function (item) {
				// Filtramos el array buscando los inputs que cumplen los requisitos y los contamos
				
			  
				   	var string = item.input;
					var words = string.split(" ");

					item.words = [];
					item.complete = [];
				
					for(var i=0; i < words.length; i++){

						if(item.hasOwnProperty('pattern')){

							if( item.pattern.indexOf(words[i]) > -1 ){
									item.words.push({
										  isInput: true,								      
									});
									

							} 
						}else{

							if( item.options.indexOf(words[i]) > -1 ){
									item.words.push({
										  isInput: true,								      
									});
									

							} 
						}
							

					}

				


				// Si se han completado todos
				if(item.hasOwnProperty('pattern')){
					if ( item.words.length >= item.pattern.length || item.pattern[0] === "free" && item.input.length >= item.length) {

						/*item.complete.push({
										  complete: true,								      
									});*/
						item.wrong = false;
						item.right = true;
						var completedInputs = scope.items.filter(function(item){
							return item.item.right === true && item.item.input.length >= item.item.length;
						}).length;

						// Si se han completado todos
							if (completedInputs === chances) {
								scope.$root.isNextEnabled = true; // Activamos el siguiente vínculo
							} else {
								scope.$root.isNextEnabled = false; // Desactivamos el siguiente vínculo
							}	
					}else{
								if(item.right === true){
								item.right = false;
								item.wrong = true;}
								var completedInputs = scope.items.filter(function(item){
								return item.item.right === true && item.item.input.length >= item.item.length;
								}).length;

								// Si se han completado todos
									if (completedInputs === chances) {
										scope.$root.isNextEnabled = true; // Activamos el siguiente vínculo
									} else {
										scope.$root.isNextEnabled = false; // Desactivamos el siguiente vínculo
									}	
							}
				}else{

					if ( (item.words.length >= 1 && item.hasOwnProperty('options') ) && item.input.length >= item.length) {

						/*item.complete.push({
										  complete: true,								      
									});*/
						item.wrong = false;
						item.right = true;
						var completedInputs = scope.items.filter(function(item){
							return item.item.right === true && item.item.input.length >= item.item.length;
						}).length;

						// Si se han completado todos
							if (completedInputs === chances) {
								scope.$root.isNextEnabled = true; // Activamos el siguiente vínculo
							} else {
								scope.$root.isNextEnabled = false; // Desactivamos el siguiente vínculo
							}	
					}else{
								if(item.right === true){
								item.right = false;
								item.wrong = true;}
								var completedInputs = scope.items.filter(function(item){
									return item.item.right === true && item.item.input.length >= item.item.length;
								}).length;

								// Si se han completado todos
									if (completedInputs === chances) {
										scope.$root.isNextEnabled = true; // Activamos el siguiente vínculo
									} else {
										scope.$root.isNextEnabled = false; // Desactivamos el siguiente vínculo
									}	
							}
				}	

			}; // verify()

		}


    }; 
});


var lizGroupTableTextFree = angular.module('lizGroupTableTextFree', []);

lizGroupTableTextFree.directive('groupTableTextFree', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_table_text_free.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			blockText: '@',
			mainimg: '@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.pattern = scope.items.pattern;
			scope.text = scope.items.text;
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow){
					styles += "width: " + (100 / scope.itemsPerRow) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-right: " + (10 / scope.itemsPerRow) + "%!important;";
				} else {
					styles += "width: " + (100 / scope.items.length) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
				}
				
				return styles;

				
			};

				
			/**
			 * Definimos nuestra función beforeGoNext para que muestre el cuadro de felicitaciones
			 */
			scope.$root.beforeGoNext = function () {
				scope.success = true;
				return true; 
			};
		   
			/**
			 * Verifica si el todos los inputs cumplen la longitud minima de caracteres 
			 */
			 
			scope.verify = function (item) {
				// Filtramos el array buscando los inputs que cumplen los requisitos y los contamos
				
				var completedInputs = scope.items.filter(function(item){
					return item.input.length >= item.length && item.input;
				}).length;

				// Si se han completado todos
				if (completedInputs === scope.items.length) {
					scope.$root.isNextEnabled = true; // Activamos el siguiente vínculo
				} else {
					scope.$root.isNextEnabled = false; // Desactivamos el siguiente vínculo
				}	
			}; // verify()

		}


    }; 
});


var lizGroupTableTextOptions = angular.module('lizGroupTableTextOptions', []);

lizGroupTableTextOptions.directive('groupTableTextOptions', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/group_table_text_options.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			blockText: '@',
			mainimg: '@',
			addicon: '@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.titles = scope.options.titles;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.pattern = scope.items.pattern;
			scope.text = scope.items.text;
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			chancesPerItem = scope.options.chancesPerItem ? scope.options.chancesPerItem : 1
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			
			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(rows) {
				var styles = "";
				

				if(rows === undefined ){
					styles += "height: " + (108) + "px;";
					
				} 
				else{
					styles += "height: " + (40 * rows) + "px;";
					styles += "padding-top: " + (5 * rows) + "px;";
				}
				
				
				return styles;

				
			};

				
			/**
			 * Definimos nuestra función beforeGoNext para que muestre el cuadro de felicitaciones
			 */
			scope.$root.beforeGoNext = function () {
				scope.success = true;
				return true; 
			};
		   
			/**
			 * Verifica si el todos los inputs cumplen la longitud minima de caracteres 
			 */
			 
			scope.verify = function (item) {

				if((item.input === '' ) || ! item.hasOwnProperty('input')) return;

				// Filtramos el array buscando los inputs que cumplen los requisitos y los contamos
				
					item.complete = [];
				
						if( item.pattern.indexOf(item.input) > -1 ){
								
								item.complete.push({
									  complete: true,								      
								});
								

						} 

						else{
							
						}

					

				


				// Si se han completado todos
					
				if (item.complete.length >= 1) {
							
							rightAnswers++;
							chances--;
							item.wrong = false;
							item.right = true;
							item.completed = true; // marcamos el item como completo, para desactivar el input
							
					} 
					else {
							item.wrong ? chancesPerItem = scope.options.chancesPerItem ? scope.options.chancesPerItem - 1 : chancesPerItem = 1 : chancesPerItem = scope.options.chancesPerItem ? scope.options.chancesPerItem : chancesPerItem = 1 ;
							chancesPerItem--	
							item.wrong = true;
						
								if(chancesPerItem === 0){
		                    	item.completed = true;
		                    	chances--;
		                    	chancesPerItem = scope.options.chancesPerItem ? scope.options.chancesPerItem : 1
		                    	}
		                    	else{item.input="";}

					}

					// fin de la actividad
					if(chances === 0){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} 					
			}; // verify()

		}


    }; 
});


var lizImageGroupDrop = angular.module('lizImageGroupDrop', ['factories']);

// Knockout Pairs Factory
lizImageGroupDrop.factory('imageGroupDropActivity', function ($rootScope, shuffleArrayFactory) {

	var imageGroupDropActivity = {};

	/**
	 * Crea el ViewModel
	 */
	imageGroupDropActivity.create = function (options) {
		return new imageGroupDropActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 */
	imageGroupDropActivity._ViewModel = function (opt) {
		var self = this,
			newGroup = false,
			totalItems = 0, // Número total de elementos
			chances = opt.chances,
			minRightAnswers = opt.minRightAnswers,
			rightAnswers = 0;

		function Group (opt) {
			this.sortable = ko.observableArray();
			this.sortable.id = (Math.random() + 1).toString(36).substring(7); // Creamos una cadena aleatoria

			// Medidas
			this.t = opt.t;
			this.l = opt.l;
			this.w = opt.w;
			this.h = opt.h;
		}

		// Imagen de fondo del conjunto
		self.bg = {
			src: opt.src,
			alt: opt.alt
		};

		// textos
		self.topText = opt.topText;
		self.bottomText = opt.bottomText;

		// Formación de grupos
		self.groups = ko.observableArray(); // Observable de grupos
		self.stack = ko.observableArray(); // pila de elementos

		opt.groups.forEach(function(group){
			newGroup = new Group(group);

			self.groups.push(newGroup);

			// añadimos cada item a la pila, añadiendole la referencia a su padre (grupo)
			group.items.forEach(function(item){
				item.id = newGroup.sortable.id;
				self.stack.push(item);
			});
		});

		

		// barajamos la pila
		shuffleArrayFactory.run(self.stack());

		totalItems = self.stack().length;

		// audio
		self.audio = ko.observable(opt.audio);

		// Carpeta de recursos desde angular
		self.resources = $rootScope.resources;

		// Calificaciones
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();
		self.failure = ko.observable(false);
		self.success = ko.observable(false);

		/**
		 * Reproduce el audio de la instrucción.
		 */
		self.playAudio = function () {
			$('#audio-instruction')[0].play();
		};


		/**
		 * Devuelve los estilos de los grupos
		 */
		self.getGroupStyles = function (group) {
			var styles = '';

			styles += "top: " + group.t + "%;";
			styles += "left: " + group.l + "%;";
			styles += "width: " + group.w + "%;";
			styles += "height: " + group.h + "%;";
			
			return styles;
		};

		/**
		 * Devuelve los estilos de los grupos
		 */
		self.getItemStyles = function (item) {
			var styles = '';

			styles += "top: " + item.t + "%;";
			styles += "left: " + item.l + "%;";
			
			return styles;
		};

		/**
		 * Verifica la respuesta cada vez que se suelta el elemento.
		 */
		self.verifyAnswer = function (arg) {
			var parent = arg.targetParent,
				item = arg.item;

			if(arg.sourceParent === parent) return;

			// Respuesta correcta
			if(item.id === parent.id) {
				self.rightAnswer(Math.random());
				rightAnswers++;
			} else {
				self.wrongAnswer(Math.random());
				arg.cancelDrop = true;
			}

			chances--;

			if (rightAnswers === totalItems || chances === 0) {
				if (rightAnswers >= minRightAnswers) {
					$rootScope.isNextEnabled = true;
					self.success(true);
				} else {
					self.failure(true);
				}
				// éxito
			} 
		};



	};

	/**
	 * Inicializa la instancia del ViewModel creado con imageGroupDropActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	imageGroupDropActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return imageGroupDropActivity;

});

lizImageGroupDrop.directive('imageGroupDrop', function  (imageGroupDropActivity) {
	return {
		restrict: 'E',
		transclude: true,
		scope: {
			options: '=',
			description: '@',
			audio:'@'
		},
		templateUrl: '../views/activities/image_group_drop.html',
		link: function postLink(scope, element, attrs) {
			// Añadimos el audio a options
			scope.options.audio = scope.hasOwnProperty('audio') ? scope.audio : false;

			// Corremos la aplicación
			var vm = imageGroupDropActivity.create(scope.options);
			imageGroupDropActivity.run(vm);
		}
	}; 
});

var lizImageMapSelect = angular.module('lizImageMapSelect', []);

lizImageMapSelect.directive('imageMapSelect', function  () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			audio: '@',
			description: '@'
		},
		templateUrl: '../views/activities/image_map_select.html',
		link: function (scope, element, attrs) {
			var opt = scope.options,
				rightAnswers = 0,
				completedAnswers = 0;
				minRightAnswers = opt.minRightAnswers;

			// Asignación
			scope.items = opt.items;
			scope.img = opt.img;
			scope.alt = opt.alt;

			// Calificación
			scope.success = false;
			scope.failure = false;
			scope.wrongAnswer = false;

			scope.selectedItem = false;

			// Recorremos los items y añadimos el número de oportunidades por item
			scope.items.forEach(function(item){
				item.chances = 2;
			});


			/**
			 * Selecciona el item al dar click
			 */
			scope.selectItem = function (item) {
				scope.selectedItem = item;
			};


			/**
			 * Verifica la respuesta
			 */
			scope.verify = function (item) {
				// si no se ha seleccionado ningún elemento
				if(!scope.selectedItem) return;

				// validación
				if(scope.selectedItem === item) {
					// Respuesta correcta
					completedAnswers++; // Aumentamos el contador de respuestas terminadas
					rightAnswers++; // Aumenta el número de respuestas correctas

					scope.selectedItem.isRight = true;
					scope.selectedItem.completed = true; // marca el elemento como completo

					scope.selectedItem = false; // reinicia el objeto seleccionado
				} else {
					// Respuesta Incorrecta
					scope.selectedItem.chances--;

					// mostramos el ícono de error, solo la primera vez
					if(scope.selectedItem.chances === 1) scope.wrongAnswer = Math.random();
					
					// Desactivamos el elemento seleccionado
					if(scope.selectedItem.chances === 0) {
						completedAnswers++; // Aumentamos el contador de respuestas terminadas

						scope.selectedItem.isWrong = true;
						scope.selectedItem.completed = true;
						scope.selectedItem = false; // reinicia el objeto seleccionado
					}
				}

				// fin de la actividad
				if(scope.items.length === completedAnswers) {
					if(rightAnswers >= minRightAnswers) {
						// Éxito
						scope.$root.isNextEnabled = true;
						scope.success = true;
					} else {
						// Fracaso
						scope.failure = true;
					}
				}
			};

			/**
			 * Obtiene la posición de los elementos
			 */
			scope.getStyles = function (item) {
				var styles = '';

				styles += "top: " + item.t + "%;";
				styles += "left: " + item.l + "%;";
				
				return styles;
			};

		}
	}; 
});

var lizInputsAndTable = angular.module('lizInputsAndTable', []);

lizInputsAndTable.directive('inputsTable', function () {
	return {
		restrict: 'E',
		templateUrl: '../views/activities/inputs_and_table.html',
		scope: {
			options: "=",
			instruction: '@',
			audio: '@',
			description: '@'
		},
		link: function (scope) {
			var opt = scope.options,
				rightAnwers = 0, // Respuestas correctas
				backCounter = opt.inputs.length + opt.table.body.length; // total de inputs

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;
			scope.inputs = opt.inputs;
			scope.table = opt.table;

			// calificación
			scope.rightAnswer = false;
			scope.wrongAnswer = false;
			scope.success = false;
			scope.failure = false;

			// Se añade el input a inputs y a table
			scope.inputs.forEach(function (i) { 
				i.input = ''; 
				i.chances = opt.chancesPerInput; // Se definen las posibilidades para cada input
			});

			scope.table.body.forEach(function (i) { 
				i.input = ''; 
				i.chances = opt.chancesPerInput; // Se definen las posibilidades para cada input
			});

			console.log(scope.table);

			/**
			 * Compara el valor ingresado por el usuario con el especificado en el objeto
			 */
			scope.verify = function (item) {
				// Valida solamente si tiene el mismo número de letras
				if(item.input.length !== item.expects.length) return;

				// respuesta correcta/incorrecta
				if(item.input === item.expects){
					scope.rightAnswer = Math.random(); // Dispara el flash
					item.disabled = true; // Deshabilita el input

					rightAnwers++;
					backCounter--; // Reduce el contador para finalizar la actividad
				} else {
					scope.wrongAnswer = Math.random();
					item.chances--; // Reducimos las posibilidades
					item.input = ''; // Limpia el input

					// Deshabilita el input si se acaban las posibilidades
					if(item.chances === 0){
						item.disabled = true; 
						backCounter--; // Reduce el contador para finalizar la actividad
					} 
				}

				console.log(backCounter);

				// Fin de la actividad
				if(backCounter === 0)	{
					if(rightAnwers >= opt.minRightAnswers){
						scope.$root.isNextEnabled = true;
						scope.success = true;
					} else {
						scope.failure = true;
					}
				}
			};
			
			/**
			 * Devuelve los estilos para los inputs.
			 * Usado principalmente para definir el width de cada elemento.
			 */
			scope.getInputStyles = function () {
				var styles = '';
				styles += "width: " + (100 / scope.inputs.length) + "%;";

				return styles;
			};


		}
	};
});

var lizJoiningLines = angular.module('lizJoiningLines', []);

lizJoiningLines.directive('joiningLines', function () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			title: '@',
			description: '@',
			audio:'@',
			instruction: '@',
			alt: '@',
			mainimg: '@'
		},
		templateUrl: '../views/activities/joining_lines.html',
		link: function (scope, element, attrs) {

			var opt = scope.options;
				

			scope.items = opt.items;
			scope.answers = opt.answers;
			scope.selectedItem = false; // elemento seleccionado
			scope.selectedItem2 = false; // elemento seleccionado
			minRightAnswers = opt.minRightAnswers;
			var chancesPerItem = opt.chancesPerItem ? opt.chancesPerItem : 1;
			scope.linesContainer = opt.linesContainer;
			var rightAnswers = 0; // Contador de preguntas buenas
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			var completedItems = 0;

			
			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {
				if(item.isCompleted === true) return;

				scope.selectedItem2.wrong = false;
				scope.selectedItem2 = false;
				scope.selectedItem = item; // seleccionamos el objeto

				

				// Fin de la actividad
				if(completedItems === (scope.items.length) ){
					scope.$root.isNextEnabled = true;
				}
			};

			scope.selectItem2 = function (item) {
				if(item.isCompleted === true || scope.selectedItem === false) return;

				scope.selectedItem2.wrong = false;
				scope.selectedItem2 = item; // seleccionamos el objeto

				if(scope.selectedItem.answer === scope.selectedItem2.answer){

					rightAnswers++;
					scope.selectedItem2 = false;
					scope.selectedItem.wrong = false;
					scope.selectedItem.right = true;
					item.wrong = false;
					item.right = true;
					
					if(!item.hasOwnProperty('isCompleted')){
						scope.selectedItem.isCompleted = true;// marcamos el elemento, para no volver a seleccionarlo
						item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
						scope.selectedItem = false;
						completedItems++;
					}

				}else{

					if(scope.selectedItem.chances === 1){
						scope.selectedItem.isCompleted = true// marcamos el elemento, para no volver a seleccionarlo
						scope.selectedItem.wrong = true;
						scope.selectedItem = false;
						completedItems++;
					}
					
					scope.selectedItem.flash = true;
					scope.selectedItem.chances = 1;
					scope.selectedItem.right = false;
					item.wrong = true;
					item.right = false;
					console.log(scope.selectedItem);

					

				}


				// Fin de la actividad
				if(completedItems === (scope.items.length) ){
					if(rightAnswers >= minRightAnswers) {
						scope.$root.isNextEnabled = true;
			          scope.success = true;
			          return true;
			        }

			        scope.failure = true;
			        return false;
				}
			};

		 /**
		 * Devuelve los estilos según el elemento
		 */
		scope.getTargetsStyles = function (item) {
			var styles = '';
			styles += 'width: ' + item.w + '%;';
			styles += 'height: ' + item.h + '%;';
			styles += 'top: ' + item.t + '%;';
			styles += 'left: ' + item.l + '%;';
			styles += '-webkit-transform:rotate(' + item.r + 'deg);';
			styles += '-moz-transform:rotate(' + item.r + 'deg);';
			styles += '-o-transform:rotate(' + item.r + 'deg);';
			styles += '-ms-transform:rotate(' + item.r + 'deg);';
			styles += 'transform:rotate(' + item.r + 'deg);';

			return styles;
		};

		}
	}; 
});


var lizLetterSoup = angular.module('lizLetterSoup', ['factories']);

lizLetterSoup.directive('letterSoup', function () {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      audio: '@',
      description: '@',
      instruction: '@'
    },
    templateUrl: '../views/activities/letter_soup.html',
    link: function (scope, element, attrs) {
      var opt = scope.options, // Alias de opciones
        chances = opt.chances, // Oportunidades totales
        minRightAnswers = opt.minRightAnswers, // Número mínimo de respuestas correctas
        totalWords = 0, // Número total de palabras
        rightAnswers = 0; // contador de preguntas correctas

      scope.groupStyle = opt.groupStyle ? opt.groupStyle : false; // estilos que define com se ven los grupos de palbras
      scope.tableStyle = opt.tableStyle ? opt.tableStyle : false; // estilos que define com se ve la tabla con las letras
      console.log(scope.groupStyle);
      scope.table = []; // Array para la tabla
      scope.startPoint = false; // punto inicial
      scope.wordGroups = opt.wordGroups;

      scope.inverted = opt.inverted; // Define si las pistas y la sopa de letra intercambian espacios

      // variables de calificación
      scope.rightAnswer = false;
      scope.wrongAnswer = false;
      scope.success = false;
      scope.failure = false;

      // Recorremos todas las palabras
      scope.wordGroups.forEach(function (group) {
        group.items.forEach(function (word) {
          // Contamos el número total de palabras
          totalWords++;

          // Si no tiene propiedad front, usamos la propiedad back
          if (!word.hasOwnProperty('front')) word.front = word.back;
        });
      });


      // ------------------------------------------
      // Constructor de table
      // ------------------------------------------
      // Recorremos el array en opciones y creamos un nuevo array multidimensional,
      // añadiendo objetos para cada celda
      for (var i = 0; i < opt.table.length; i++) {
        var temp = [];

        // Añadimos a cada uno el índice (x - y) y la letra (obviamente)
        for (var j = 0; j < opt.table[i].length; j++) {
          temp.push({
            x: j,
            y: i,
            letter: opt.table[i][j]
          });
        }

        scope.table.push(temp);
      }

      /**
       * Busca la palabra en base a las coordenadas (índices)
       */
      scope.searchWord = function (cell) {
        if (!scope.startPoint) {
          // Define el punto inicial
          scope.startPoint = cell;
        } else {
          // ============================================================================
          // Validación y calificación
          // ============================================================================
          var str = '', // cadena encontrada
            rightSelection = false, // define si la selección fue bien realizada
            found = false; // Variable que alberga la palabra encontrada, si es el caso

          // Recorremos las celdas y recuperamos la palabra formada
          rightSelection = scope.forEachCell(scope.startPoint, cell, function (cell) {
            str += cell.letter;
          });

          // Si la selección no se hizo bien, entonces termina la función
          if (!rightSelection) {
            scope.startPoint = false; // vuelve al estado inicial
            return;
          }

          scope.wordGroups.forEach(function (group) {
            group.items.forEach(function (word) {
              // Verificamos la palabra, tanto de una forma, como al revés
              if (word.back === str || word.back === str.split("").reverse().join("")) {
                found = word;
              }
            });
          });

          // Si la palabra ha sido encontrada y no ha sido completada anteriormente, la completamos
          if (found) {
            if (!found.completed) {
              found.completed = true; // la marcamos como completada
              scope.rightAnswer = Math.random(); // Disparamos el evento de respuesta correcta

              rightAnswers++;

              // Recorremos nuevamente las celdas para marcarlas como terminadas
              scope.forEachCell(scope.startPoint, cell, function (cell) {
                cell.completed = true;
              });
            }
          } else {
            // Respuesta incorrecta
            scope.wrongAnswer = Math.random();
          }

          chances--; // Reducimos las posibilidades
          scope.startPoint = false; // vuelve al estado inicial

          // Si se acaban las oportunidades, o se terminan todas las palabras
          if (chances === 0 || rightAnswers === totalWords) {
            if (rightAnswers >= minRightAnswers) {
              scope.$root.isNextEnabled = true;
              scope.success = true;
            } else {
              scope.failure = true;
            }
          }
        }

        scope.cleanTable(); // Limpia la tabla
      };


      /**
       * Muestra el camino en caso de que sea correcto
       */
      scope.showPath = function (cell) {
        if (scope.startPoint) {
          scope.cleanTable(); // Limpia la tabla

          scope.forEachCell(scope.startPoint, cell, function (cell) {
            cell.selected = true;
          });
        }
      };


      /**
       * Limpia la tabla
       */
      scope.cleanTable = function () {
        for (var i = 0; i < opt.table.length; i++) {
          for (var j = 0; j < opt.table[i].length; j++) {
            scope.table[i][j].selected = false;
          }
        }
      };

      /**
       * Recorre las celdas desde el punto de inicio al punto final.
       *
       * @return boolean Selección correcta o no
       */
      scope.forEachCell = function (start, end, callback) {
        var rightSelection = false;

        // Horizontales
        if (end.x === start.x) {

          rightSelection = true;

          if (end.y > start.y) {
            for (var i = start.y; i <= end.y; i++) {
              callback(scope.table[i][end.x]);
            }
          } else {
            for (var i = start.y; i >= end.y; i--) {
              callback(scope.table[i][end.x]);
            }
          }
        } //fin Horizontales

        // Verticales
        if (end.y === start.y) {

          rightSelection = true;

          if (end.x > start.x) {
            for (var i = start.x; i <= end.x; i++) {
              callback(scope.table[end.y][i]);
            }
          } else {
            for (var i = start.x; i >= end.x; i--) {
              callback(scope.table[end.y][i]);
            }
          }
        } //fin Verticales

        // abajo - derecha
        if (start.x < end.x && start.y < end.y && (start.x - end.x === start.y - end.y)) {

          rightSelection = true;

          for (var y = start.y; y <= end.y; y++) {
            for (var x = start.x; x <= end.x; x++) {
              if (start.x - x === start.y - y) {
                callback(scope.table[y][x]);
              }
            }
          }
        } // fin abajo - derecha

        // arriba - derecha
        if (start.x < end.x && start.y > end.y && (start.x - end.x === end.y - start.y)) {

          rightSelection = true;

          for (var y = end.y; y <= start.y; y++) {
            for (var x = start.x; x <= end.x; x++) {
              if (start.x - x === y - start.y) {
                callback(scope.table[y][x]);
              }
            }
          }
        } // fin arriba - derecha

        // abajo - izquierda
        if (start.x > end.x && start.y < end.y && (end.x - start.x === start.y - end.y)) {

          rightSelection = true;

          for (var y = start.y; y <= end.y; y++) {
            for (var x = end.x; x <= start.x; x++) {
              if (x - start.x === start.y - y) {
                callback(scope.table[y][x]);
              }
            }
          }
        } // fin abajo - izquierda

        // arriba - izquierda
        if (start.x > end.x && start.y > end.y && (end.x - start.x === end.y - start.y)) {

          rightSelection = true;

          for (var y = end.y; y <= start.y; y++) {
            for (var x = end.x; x <= start.x; x++) {
              if (x - start.x === y - start.y) {
                callback(scope.table[y][x]);
              }
            }
          }
        } // fin arriba - izquierda

        return rightSelection;
      };

      /**
       * Devuelve los estilos personalizados de las pistas.
       */
      scope.getClueStyles = function () {
        return opt.clueStyle ? opt.clueStyle : '';
      };


    }
  };
});


;var lizMultipleMark = angular.module('lizMultipleMark', []);

// Knockout Pairs Factory
lizMultipleMark.factory('multipleMarkActivity', function ($rootScope) {

	var multipleMarkActivity = {};

	/**
	 * Crea el ViewModel
	 */
	multipleMarkActivity.create = function (options) {
		return new multipleMarkActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		options						Opciones a utilizar.
	 * @param {Array}		options.items				Elementos donde se suelta la marca. Deben tener la propiedad bool "answer"
	 * @param {integer}		options.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		options.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {function}	options.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	options.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 *
	 */
	multipleMarkActivity._ViewModel = function (options) {
		var self = this,
				rightAnswers = 0,
				chances = typeof options.chances !== "undefined" ? options.chances : options.items.length,
				minRightAnswers = options.minRightAnswers,
				maximumElements = 1;


		self.answers = ko.observableArray(options.answers);
		self.items = ko.observableArray(options.items);

		// Añadimos a cada item un observableArray para que puedan recibir las marcas
		ko.utils.arrayForEach(self.items(), function(item){
			item._target = ko.observableArray();
			item._target._ids = item.answers; // para poder identificar si esta bueno o malo
		});

		// Carpeta de recursos desde angular
		self.resources = $rootScope.resources;

		// Triggers que se activan cuando la respuesta es correcta/incorrecta
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
		self.failure = ko.observable(false);
		self.success = ko.observable(false);

		/**
		 * Define si el target esta lleno utilizando self.maximumElements
		 */
		self.isContainerFull = function (parent) {
			return parent().length < maximumElements;
		};

		/**
		 * Función que se ejecuta al soltar los elementos
		 */
		self.verifyAnswer = function (arg) {
			var item = arg.item,
			parent = arg.targetParent;

			// Buscamos el id dentro de las respuestas
			if(parent._ids.indexOf(item.id) >= 0){
				// respuesta correcta
				self.rightAnswer(item);
				rightAnswers++;

				if(typeof options.rightAnswerCallback !== "undefined") options.rightAnswerCallback(item);
			} else {
				// respuesta incorrecta
				self.wrongAnswer(item);
				arg.cancelDrop = true; // Devuelve el elemento
			}

			chances--;


			// Final de la actividad
			if(chances === 0){
				if(rightAnswers >= minRightAnswers){
					// éxito
					self.success(true);

					$rootScope.isNextEnabled = true; // Activamos la siguiente ruta en angular

					if(typeof options.successCallback !== "undefined") options.successCallback();

				} else {
					// Fracaso
					self.failure(true);
				}
			}
		}
	};

	/**
	 * Inicializa la instancia del ViewModel creado con multipleMarkActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	multipleMarkActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return multipleMarkActivity;

});

lizMultipleMark.directive('multipleMark', function  (multipleMarkActivity) {
	return {
		restrict: 'E',
		transclude: true,
		scope: {
			options: '=',
			description: '@'
		},
		templateUrl: '../views/activities/multiple_mark.html',
		link: function postLink(scope, element, attrs) {
			// Corremos la aplicación
			multipleMarkActivity.run(multipleMarkActivity.create(scope.options));
		}
	}; 
});

var lizMultipleSelection = angular.module('lizMultipleSelection', ['factories']);

lizMultipleSelection.directive('multipleSelection', function  (shuffleArrayFactory) {
    return {
        restrict: 'E',
		scope: {
			options: '=',
			description: '@'
		},
        templateUrl: '../views/activities/multiple_selection.html',
		link: function postLink(scope, element, attrs) {

			scope.items = shuffleArrayFactory.run(scope.options.items);
			scope.optionsPerRow = scope.options.hasOwnProperty('optionsPerRow') ? scope.options.optionsPerRow : false;

			// Revolvemos las opciones
			angular.forEach(scope.items, function(item){
				item.options = shuffleArrayFactory.run(item.options);
			});

			// Variables de éxito - fracaso
			scope.success = false;
			scope.failure = false;

			scope.chances = typeof scope.options.chances !== "undefined" ? scope.options.chances : scope.items.length; // Posibilidades de realizar la actividad
			scope.rightAnswers = 0; // contador de respuestas buenas
			scope.minRightAnswers = scope.options.minRightAnswers; // número mínimo de respuestas

			// Disparadores para las preguntas buenas y malas
			scope.rightAnswer = false;
			scope.wrongAnswer = false;

			/**
			 * Verifica la respuesta
			 */
			scope.verify = function (item, option) {

				if (option.answer) {
					// respuesta buena
					item.isRight = true;

					scope.rightAnswers++;
				} else {
					// Respuesta incorrecta
					item.isWrong = true;
				}

				scope.chances--;

				//// Fin de la actividad
				if(scope.chances === 0) {
					if (scope.rightAnswers >= scope.minRightAnswers) {
						scope.success = true;

						// Activamos la siguiente
						scope.$root.isNextEnabled = true;
					} else {
						scope.failure = true;
					}
				}
			};	

			/**
			 * Estilos de las opciones
			 */
			scope.getOptionsStyles = function () {

				// Si se define el número de elementos por ronda, devolvemos los estilos definidos
				if(scope.optionsPerRow)
					return "width: " + (100 / scope.optionsPerRow) + "%; float: left";

				// Por defecto
				return "";

			};

		}
	}; 
});

var lizNumericSequences = angular.module('lizNumericSequences', []);

lizNumericSequences.directive('numericSequences', function  () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			description: '@',
			audio: '@'
		},
		templateUrl: '../views/activities/numeric_sequences.html',
		link: function (scope, element, attrs) {

			var opt = scope.options,
				rightAnswers = 0, // Contador de preguntas buenas
				minRightAnswers = opt.minRightAnswers,
				chances = 0, // Contador de posibilidades
				sequences = opt.sequences;

			scope.sequences = [];

			// Disparadores para las preguntas buenas/malas
			scope.rightAnswer = false;
			scope.wrongAnswer = false;

			scope.success = false;
			scope.failure = false;
			
			// Constructor de sequences
			sequences.forEach(function(s){
				scope.sequences.push([]); // Añadimos el nuevo array

				var temp = scope.sequences[ scope.sequences.length - 1 ], // Puntero del último array
					number = {}; // variable temporal para los números

				for(var i=0; i < s.sequence.length; i++){
					number = { number: s.sequence[i] }; // Creamos el nuevo elemento

					// si el elemento definido esta lleno, entonces solo se muestra. En caso contrario
					// se crea un input (html)
					if(s.toFill.indexOf(i) >= 0) {
						chances++; // alimentamos el número de posibilidades
						number.filled = false;  
					} else {
						number.filled = true;
					} 

					// añadimos el elemento
					temp.push(number); 
				}
			}); // END forEach

			/**
			 * Verifica la respuesta en el item
			 */
			scope.verify = function (item) {
				if(item.input === '') return; 

				// Si no es un número, borramos el último caractér
				if(!opt.allowAll) {
					if(!item.input.match(/^\d+$/)){
						item.input = item.input.slice(0, -1);
						return;
					}		
				}

				// Si se ha llenado el input con los dígitos necesarios
				if(item.input.length === item.number.length){
					// Verificamos la respuesta
					if(item.input === item.number){
						scope.rightAnswer = item.number;
						rightAnswers++;
					} else {
						scope.wrongAnswer = item.number;
					}

					item.completed = true; // marcamos el item como completo, para desactivar el input
					chances--;

					// fin de la actividad
					if(chances === 0){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} // if 
				} // if
			}; // verify()

		}
	}; 
});

var lizOneGroup = angular.module('lizOneGroup', []);

// Knockout Pairs Factory
lizOneGroup.factory('oneGroupActivity', function ($rootScope) {

	var oneGroupActivity = {};

	/**
	 * Crea el ViewModel
	 */
	oneGroupActivity.create = function (options) {
		return new oneGroupActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		opt						Opciones a utilizar.
	 * @param {Array}		opt.data				Información de los elementos. Es necesario que cada una tenga la propiedad:
	 *
	 * 	answer: {boolean} define si la respuesta es correcta o incorrecta y puede ser soltada en el contenedor
	 * 	src: {string} imagen para el elemento
	 * 	alt: {string} texto alternativo
	 *
	 * @param {integer}		opt.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		opt.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {function}	opt.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	opt.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 * @param {integer}		opt.itemsPerRow			Número de elementos por fila. 3 por defecto
	 * @param {boolean}		opt.priority			Define si el botón de siguiente estará activo desde el inicio
	 *
	 */
	oneGroupActivity._ViewModel = function (opt) {
		var self = this;

		self.groupImg = opt.hasOwnProperty('groupImg') ? opt.groupImg : false;
		self.groupAlt = opt.hasOwnProperty('groupAlt') ? opt.groupAlt : false;

		// Observables 
		self.items = ko.observableArray(opt.data);
		self.target = ko.observableArray();

		// Propiedades por defecto, si no existen
		ko.utils.arrayForEach(self.items(), function(item){
			if(! item.hasOwnProperty('answer')) item.answer = true;
			if(! item.hasOwnProperty('title')) item.title = ''; 
			if(! item.hasOwnProperty('text')) item.text = false; 
		});

		// Ruta a la carpeta de imágenes
		self.resources = $rootScope.resources;
		self.itemsPerRow = typeof opt.itemsPerRow !== "undefined" ? opt.itemsPerRow : 3;

		// Disparador de preguntas correctas/incorrectas
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		self.success = ko.observable(false);
		self.failure = ko.observable(false);

		self.rightAnswers = 0;

		self.chances = opt.chances ? opt.chances : opt.data.length;
		self.totalRightAnswer = opt.totalRightAnswer ? opt.totalRightAnswer : opt.data.length;
		self.priority = opt.priority

		// audio
		self.audio = ko.observable(opt.audio);

		/**
		 * Reproduce el audio de la instrucción.
		 */
		self.playAudio = function () {
			$('#audio-instruction')[0].play();
		};

		/**
		 *	Función que se ejecuta al soltar el objeto dentro del contenedor
		 */
		self.verifyAnswer = function (arg) {

			// No hacer nada y salir de la función, si el elemento se soltó en el mismo grupo inicial
			if(arg.sourceParent() == arg.targetParent()) return;

			// Calculamos si la respuesta es correcta o no usando la propiedad 'answer'
			if (arg.item.answer) {
				// Respuesta correcta
				self.rightAnswer(arg.item);
				self.rightAnswers++;

				// Llama a la función de respuesta buena
				if (typeof opt.rightAnswerCallback !== "undefined") opt.rightAnswerCallback();

			} else {
				// Respuesta Incorrecta
				self.wrongAnswer(arg.item);
				arg.cancelDrop = true; // Devuelve el elemento a su posición origina
			}

			// Reducimos las posibilidades
			self.chances--;

			// Fin de la actividad
			if (self.chances === 0 || self.rightAnswers >= self.totalRightAnswer ) {
				if(self.rightAnswers >= opt.minRightAnswers) {
					// éxito
					self.success(true);

					// Llama a la función de éxito
					if (typeof opt.successCallback !== "undefined") opt.successCallback();

					// Eliminamos beforeGoNext, si existe
					if(self.priority){
						$rootScope.beforeGoNext = undefined; // Limpiamos la función	
					}

					// Activamos la siguiente ruta
					$rootScope.isNextEnabled = true;

				} else {
					// Fracaso
					self.failure(true);
				}
			}

			// Si hay prioridad, activa/desactiva el botón de siguiente
			if(self.priority){
				if(self.rightAnswers >= opt.minRightAnswers) $rootScope.isNextEnabled = true;
				else $rootScope.isNextEnabled = false;

				$rootScope.$apply();
			}
		};

		// ===========================================================================
		// Si se a decidido usar la prioridad
		// ===========================================================================
		if(self.priority){

			$rootScope.beforeGoNext = function () {
				// Si el número de elementos es mayor al número de respuestas requeridas: ÉXITO!!!
				if(self.target().length >= opt.minRightAnswers){

					if (typeof opt.successCallback !== "undefined") opt.successCallback();
					self.success(true);
					return true; 

				} else {

					self.failure(true);
					return false; 

				}
			};

		}

	};

	/**
	 * Inicializa la instancia del ViewModel creado con oneGroupActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	oneGroupActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return oneGroupActivity;

});

lizOneGroup.directive('oneGroup', function  (oneGroupActivity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			audio: '@',
			description: '@',
			title: '@'
		},
		templateUrl: '../views/activities/one_group.html',
		link: function postLink(scope, element, attrs) {
			// Añadimos el audio a options
			scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;

			oneGroupActivity.run(oneGroupActivity.create(scope.options));
		}
	}; 
});


var lizOneGroupRule = angular.module('lizOneGroupRule', []);

// Knockout Pairs Factory
lizOneGroupRule.factory('oneGroupRuleActivity', function ($rootScope) {

	var oneGroupRuleActivity = {};

	/**
	 * Crea el ViewModel
	 */
	oneGroupRuleActivity.create = function (options) {
		return new oneGroupRuleActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		opt						Opciones a utilizar.
	 * @param {Array}		opt.data				Información de los elementos. Es necesario que cada una tenga la propiedad:
	 *
	 * 	answer: {boolean} define si la respuesta es correcta o incorrecta y puede ser soltada en el contenedor
	 * 	src: {string} imagen para el elemento
	 * 	alt: {string} texto alternativo
	 *
	 * @param {integer}		opt.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		opt.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {function}	opt.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	opt.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 * @param {integer}		opt.itemsPerRow			Número de elementos por fila. 3 por defecto
	 * @param {boolean}		opt.priority			Define si el botón de siguiente estará activo desde el inicio
	 *
	 */
	oneGroupRuleActivity._ViewModel = function (opt) {
		var self = this;

		self.groupImg = opt.hasOwnProperty('groupImg') ? opt.groupImg : false;
		self.groupAlt = opt.hasOwnProperty('groupAlt') ? opt.groupAlt : false;

		// Observables 
		self.items = ko.observableArray(opt.data);
		self.target = ko.observableArray();

		// Propiedades por defecto, si no existen
		ko.utils.arrayForEach(self.items(), function(item){
			if(! item.hasOwnProperty('answer')) item.answer = true;
			if(! item.hasOwnProperty('title')) item.title = ''; 
			if(! item.hasOwnProperty('text')) item.text = false; 
		});

		// Ruta a la carpeta de imágenes
		self.resources = $rootScope.resources;
		self.itemsPerRow = typeof opt.itemsPerRow !== "undefined" ? opt.itemsPerRow : 3;

		// Disparador de preguntas correctas/incorrectas
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		self.success = ko.observable(false);
		self.failure = ko.observable(false);

		self.rightAnswers = 0;

		self.chances = opt.chances ? opt.chances : opt.data.length;
		self.totalRightAnswer = opt.totalRightAnswer ? opt.totalRightAnswer : opt.data.length;
		self.priority = opt.priority

		// audio
		self.audio = ko.observable(opt.audio);

		/**
		 * Reproduce el audio de la instrucción.
		 */
		self.playAudio = function () {
			$('#audio-instruction')[0].play();
		};

		/**
		 *	Función que se ejecuta al soltar el objeto dentro del contenedor
		 */
		self.verifyAnswer = function (arg) {

			// No hacer nada y salir de la función, si el elemento se soltó en el mismo grupo inicial
			if(arg.sourceParent() == arg.targetParent()) return;

			// Calculamos si la respuesta es correcta o no usando la propiedad 'answer'
			if (arg.item.answer) {
				// Respuesta correcta
				self.rightAnswer(arg.item);
				self.rightAnswers++;

				// Llama a la función de respuesta buena
				if (typeof opt.rightAnswerCallback !== "undefined") opt.rightAnswerCallback();

			} else {
				// Respuesta Incorrecta
				self.wrongAnswer(arg.item);
				arg.cancelDrop = true; // Devuelve el elemento a su posición origina
			}

			// Reducimos las posibilidades
			self.chances--;

			// Fin de la actividad
			if (self.chances === 0 || self.rightAnswers >= self.totalRightAnswer ) {
				if(self.rightAnswers >= opt.minRightAnswers) {
					// éxito
					self.success(true);

					// Llama a la función de éxito
					if (typeof opt.successCallback !== "undefined") opt.successCallback();

					// Eliminamos beforeGoNext, si existe
					if(self.priority){
						$rootScope.beforeGoNext = undefined; // Limpiamos la función	
					}

					// Activamos la siguiente ruta
					$rootScope.isNextEnabled = true;

				} else {
					// Fracaso
					self.failure(true);
				}
			}

			// Si hay prioridad, activa/desactiva el botón de siguiente
			if(self.priority){
				if(self.rightAnswers >= opt.minRightAnswers) $rootScope.isNextEnabled = true;
				else $rootScope.isNextEnabled = false;

				$rootScope.$apply();
			}
		};

		// ===========================================================================
		// Si se a decidido usar la prioridad
		// ===========================================================================
		if(self.priority){

			$rootScope.beforeGoNext = function () {
				// Si el número de elementos es mayor al número de respuestas requeridas: ÉXITO!!!
				if(self.target().length >= opt.minRightAnswers){

					if (typeof opt.successCallback !== "undefined") opt.successCallback();
					self.success(true);
					return true; 

				} else {

					self.failure(true);
					return false; 

				}
			};

		}

	};

	/**
	 * Inicializa la instancia del ViewModel creado con oneGroupActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	oneGroupRuleActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return oneGroupRuleActivity;

});

lizOneGroupRule.directive('oneGroupRule', function  (oneGroupRuleActivity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			audio: '@',
			description: '@',
			title: '@',
		},
		templateUrl: '../views/activities/one_group_rule.html',
		link: function postLink(scope, element, attrs) {
			// Añadimos el audio a options
			scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;

			oneGroupRuleActivity.run(oneGroupRuleActivity.create(scope.options));
		}
	}; 
});


var lizOneGroupShape = angular.module('lizOneGroupShape', []);

lizOneGroupShape.factory('oneGroupShapeActivity', function ($rootScope) {

	var oneGroupShapeActivity = {};

	/**
	 * Crea el ViewModel
	 */
	oneGroupShapeActivity.create = function (options) {
		return new oneGroupShapeActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		options						Opciones a utilizar.
	 *
	 * @param {integer}		options.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		options.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {function}	options.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	options.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 *
	 */
	oneGroupShapeActivity._ViewModel = function (options) {
		var self = this;

		self.items = ko.observableArray(options.items); // Elementos a arrastrar
		self.canvas = options.canvas; // Forma del grupo
		self.canvasAlt = options.canvasAlt; // texto alternativo de la forma

		ko.utils.arrayForEach(self.items(), function (item) {
			if(! item.hasOwnProperty('answer')) item.answer = true; // Define si el objeto es una respuesta correcta
			if(! item.hasOwnProperty('startsInGroup')) item.startsInGroup = false; // Define si el objeto empieza insertado en el grupo
		});

		// Insertamos los elementos marcados en el grupo, removiéndolos de self.items
		self.group = ko.observableArray(self.items.remove(function(item){
			return item.startsInGroup;
		}));

		// Ruta a la carpeta de imágenes
		self.resources = $rootScope.resources;

		// Disparador de preguntas correctas/incorrectas
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		self.success = ko.observable(false);
		self.failure = ko.observable(false);

		self.rightAnswers = 0;

		self.chances = options.chances ? options.chances : options.items.length;

		/**
		 * Obtiene los estilos de cada elemento
		 */
		self.getStyles = function (item) {
			var styles = '';

			if(! item.answer) return;

			styles += 'width: ' + item.w + '%;';
			styles += 'height: ' + item.h + '%;';
			styles += 'top: ' + item.t + '%;';
			styles += 'left: ' + item.l + '%;';

			return styles;
		}

		/**
		 *	Función que se ejecuta al soltar el objeto dentro del contenedor
		 */
		self.verifyAnswer = function (arg) {

			// No hacer nada y salir de la función, si el elemento se soltó en el mismo grupo inicial
			if(arg.sourceParent() == arg.targetParent()) return;

			// Calculamos si la respuesta es correcta o no usando la propiedad 'answer'
			if (arg.item.answer) {
				// Respuesta correcta
				self.rightAnswer(arg.item);
				self.rightAnswers++;

				// Llama a la función de respuesta buena
				if (typeof options.rightAnswerCallback !== "undefined") options.rightAnswerCallback();

			} else {
				// Respuesta Incorrecta
				self.wrongAnswer(arg.item);
				arg.cancelDrop = true; // Devuelve el elemento a su posición origina
			}

			// Reducimos las posibilidades
			self.chances--;

			// Fin de la actividad
			if (self.chances === 0) {
				if(self.rightAnswers >= options.minRightAnswers) {
					// éxito
					self.success(true);

					// Llama a la función de éxito
					if (typeof options.successCallback !== "undefined") options.successCallback();

					// Activamos la siguiente ruta
					$rootScope.isNextEnabled = true;
				} else {
					// Fracaso
					self.failure(true);
				}
			}
		};

		};

		/**
		 * Inicializa la instancia del ViewModel creado con oneGroupShapeActivity.create
		 *
		 * @param {object} instance Intancia del VM de knockout
		 */
		oneGroupShapeActivity.run = function (instance) {
			ko.cleanNode($('#main-container')[0]);
			ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
			ko.applyBindings(instance, $('#main-container')[0]);
		};

		return oneGroupShapeActivity;
});

lizOneGroupShape.directive('oneGroupShape', function  (oneGroupShapeActivity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			description: '@'
		},
		templateUrl: '../views/activities/one_group_shape.html',
		link: function postLink(scope, element, attrs) {
			oneGroupShapeActivity.run(oneGroupShapeActivity.create(scope.options));
		}
	}; 
});


var lizOneGroupToogle = angular.module('lizOneGroupToogle', []);

// Knockout Pairs Factory
lizOneGroupToogle.factory('oneGroupActivity', function ($rootScope) {

	var oneGroupActivity = {};

	/**
	 * Crea el ViewModel
	 */
	oneGroupActivity.create = function (options) {
		return new oneGroupActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		opt						Opciones a utilizar.
	 * @param {Array}		opt.data				Información de los elementos. Es necesario que cada una tenga la propiedad:
	 *
	 * 	answer: {boolean} define si la respuesta es correcta o incorrecta y puede ser soltada en el contenedor
	 * 	src: {string} imagen para el elemento
	 * 	alt: {string} texto alternativo
	 *
	 * @param {integer}		opt.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		opt.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {function}	opt.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	opt.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 * @param {integer}		opt.itemsPerRow			Número de elementos por fila. 3 por defecto
	 * @param {boolean}		opt.priority			Define si el botón de siguiente estará activo desde el inicio
	 *
	 */
	oneGroupActivity._ViewModel = function (opt) {
		var self = this;

		self.groupImg = opt.hasOwnProperty('groupImg') ? opt.groupImg : false;
		self.groupAlt = opt.hasOwnProperty('groupAlt') ? opt.groupAlt : false;

		// Observables 
		self.items = ko.observableArray(opt.data);
		self.target = ko.observableArray();

		// Propiedades por defecto, si no existen
		ko.utils.arrayForEach(self.items(), function(item){
			if(! item.hasOwnProperty('answer')) item.answer = true;
			if(! item.hasOwnProperty('title')) item.title = ''; 
			if(! item.hasOwnProperty('text')) item.text = false; 
		});

		// Ruta a la carpeta de imágenes
		self.resources = $rootScope.resources;
		self.itemsPerRow = typeof opt.itemsPerRow !== "undefined" ? opt.itemsPerRow : 3;

		// Disparador de preguntas correctas/incorrectas
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		self.success = ko.observable(false);
		self.failure = ko.observable(false);

		self.rightAnswers = 0;

		self.chances = opt.chances ? opt.chances : opt.data.length;
		self.totalRightAnswer = opt.totalRightAnswer ? opt.totalRightAnswer : opt.data.length;
		self.priority = opt.priority

		// audio
		self.audio = ko.observable(opt.audio);

		/**
		 * Reproduce el audio de la instrucción.
		 */
		self.playAudio = function () {
			$('#audio-instruction')[0].play();
		};

		/**
		 *	Función que se ejecuta al soltar el objeto dentro del contenedor
		 */
		self.verifyAnswer = function (arg) {

			// No hacer nada y salir de la función, si el elemento se soltó en el mismo grupo inicial
			if(arg.sourceParent() == arg.targetParent()) return;

			// Calculamos si la respuesta es correcta o no usando la propiedad 'answer'
			if (arg.item.answer) {
				// Respuesta correcta
				self.rightAnswer(arg.item);
				self.rightAnswers++;

				// Llama a la función de respuesta buena
				if (typeof opt.rightAnswerCallback !== "undefined") opt.rightAnswerCallback();

			} else {
				// Respuesta Incorrecta
				self.wrongAnswer(arg.item);
				arg.cancelDrop = true; // Devuelve el elemento a su posición origina
			}

			// Reducimos las posibilidades
			self.chances--;

			// Fin de la actividad
			if (self.chances === 0 || self.rightAnswers >= self.totalRightAnswer ) {
				if(self.rightAnswers >= opt.minRightAnswers) {
					// éxito
					self.success(true);

					// Llama a la función de éxito
					if (typeof opt.successCallback !== "undefined") opt.successCallback();

					// Eliminamos beforeGoNext, si existe
					if(self.priority){
						$rootScope.beforeGoNext = undefined; // Limpiamos la función	
					}

					// Activamos la siguiente ruta
					$rootScope.isNextEnabled = true;

				} else {
					// Fracaso
					self.failure(true);
				}
			}

			// Si hay prioridad, activa/desactiva el botón de siguiente
			if(self.priority){
				if(self.rightAnswers >= opt.minRightAnswers) $rootScope.isNextEnabled = true;
				else $rootScope.isNextEnabled = false;

				$rootScope.$apply();
			}
		};

		// ===========================================================================
		// Si se a decidido usar la prioridad
		// ===========================================================================
		if(self.priority){

			$rootScope.beforeGoNext = function () {
				// Si el número de elementos es mayor al número de respuestas requeridas: ÉXITO!!!
				if(self.target().length >= opt.minRightAnswers){

					if (typeof opt.successCallback !== "undefined") opt.successCallback();
					self.success(true);
					return true; 

				} else {

					self.failure(true);
					return false; 

				}
			};

		}

	};

	/**
	 * Inicializa la instancia del ViewModel creado con oneGroupActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	oneGroupActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return oneGroupActivity;

});

lizOneGroupToogle.directive('oneGroupToogle', function  (oneGroupActivity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			audio: '@',
			description: '@',
			title: '@'
		},
		templateUrl: '../views/activities/one_group_toogle.html',
		link: function postLink(scope, element, attrs) {
			// Añadimos el audio a options
			scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;

			oneGroupActivity.run(oneGroupActivity.create(scope.options));
		}
	}; 
});


var lizOperationInput = angular.module('lizOperationInput', []);

lizOperationInput.directive('operationInput', function  () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			audio: '@',
			description: '@'
		},
		templateUrl: '../views/activities/operation_input.html',
		link: function postLink(scope, element, attrs) {
			var opt = scope.options,
				minRightAnswers = opt.minRightAnswers,
				rightAnswers = 0,
				completedInputs = 0, // Contador para encontrar el fin de la actividad
				totalInputs = opt.units.length + 1, // Unidades + total
				inputWidth = opt.hasOwnProperty('inputWidth') ? opt.inputWidth : false;

			// Remotamos las variables desde el controlador
			scope.units = opt.units;
			scope.total = opt.total;

			scope.rightAnswer = false; 
			scope.wrongAnswer = false; 
			scope.success = false; 
			scope.failure = false;

			// Constructor de items
			scope.units.forEach(function (item) {
				item._input = ''; // Modelo que se vincula al input 
				item.chances = opt.chancesPerInput; // Posibilidades por cada input
			});

			/**
			 * Verifica si el input cumple con las condiciones del número 
			 */
			scope.verify = function (item) {
				if(item._input === '') return; 

				// Si se ha llenado el input con los dígitos necesarios
				if(item.input.length === item._input.length){

					// Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
					if(item.input === item._input){
						rightAnswers++; // aumenta las respuestas correctas
						scope.rightAnswer = Math.random(); // Disparador de respuesta
						item.right = true;
					} else {
						item._input = '';
						scope.wrongAnswer = Math.random(); // Disparador de respuesta
						item.chances--;
					}

					// Termina y bloquea
					if(item.chances === 0 || item.right){
						item.completed = true; // marcamos el item como completo, para desactivar el input
						completedInputs++;
					}
					
					// fin de la actividad
					if(totalInputs === completedInputs){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} 
					
				} // if
			}; // verify()


			/*
			 * Devuelve los estilos de los inputs
			 */
			scope.getInputStyles = function () {
				var styles = '';

				if(inputWidth){
					styles += "width: " + inputWidth + ';';
				}

				return styles;
			};

		}
	}; 
});

var lizPairs = angular.module('lizPairs', []);

// Knockout Pairs Factory
lizPairs.factory('pairsActivity', function ($rootScope) {

	var pairsActivity = {};

  /**
   * Crea el ViewModel
   */
  pairsActivity.create = function (options) {
    return new pairsActivity._ViewModel(options);
  };

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		opt						Opciones a utilizar.
	 * @param {Array}			opt.data				Información de los elementos. Dentro de cada objeto, se pueden definir las propiedades:
	 *
	 *	target: Permite darle un orden apropiado a los targets. Debe empezar desde 0 y la propiedad opt.randomTargets debe estar desactivada
	 *
	 * @param {integer}		opt.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		opt.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {boolean}		opt.randomItems			Define si los elementos deben ser puestos en forma aleatoria
	 * @param {boolean}		opt.randomTargets		Define si los objetivos debe ser puestos en forma aleatoria
	 * @param {function}	opt.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	opt.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 *
	 */
	pairsActivity._ViewModel = function (opt) {
		var self = this;

		// ordena el array de forma aleatoria usando el algoritmo de Fisher-Yates
		self.shuffleArray = function(array) {
			for (var i = array.length - 1; i > 0; i--) {
				var j = Math.floor(Math.random() * (i + 1));
				var temp = array[i];
				array[i] = array[j];
				array[j] = temp;
			}
			return array;
		};

		// Inicializa las opciones
		var data = opt.data,
      minRightAnswers = opt.minRightAnswers ? opt.minRightAnswers : data.length,
      randomItems = opt.randomItems ? true : false,
      randomTargets = opt.randomTargets ? true : false,
      chances = opt.chances ? opt.chances : data.length,
      targets_data = data.slice(0),   // Clonamos el array para empezar a trabajar
      completedItems = 0, // contador de elementos completos
      border = opt.hasOwnProperty('border') ? opt.border : true,
      padding = opt.hasOwnProperty('padding') ? opt.padding : true;

		// Objetos aleatorios
		if(randomItems) {
			data = self.shuffleArray(data);
		}

		// Creamos los índices para la posición absoluta
		for(var i = 0; i < data.length; i++){
			data[i]._index = i;
		}

		self.itemsPerRow = (opt.hasOwnProperty("itemsPerRow")) ? opt.itemsPerRow : opt.data.length;

		// audio
		self.audio = ko.observable(opt.audio);

		// Definimos los observableArrays para items y targets
		self.items = ko.observableArray(data);
		self.targets = ko.observableArray();

		// Carpeta de recursos desde angular
		self.resources = $rootScope.resources;

		self.maximumElements = 1; // IMPORTANTE: Requerido para que los sortables no acepten más de un elemento
		self.rightAnswers = 0; // Inicializamos el número de respuestas buenas a 0

		// Triggers que se activan cuando la respuesta es correcta/incorrecta
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
		self.failure = ko.observable(false);
		self.success = ko.observable(false);

		// ======================================================================================
		// Constructor de los targets
		// ======================================================================================

		// Si la opción de randomTargets está activada, aplicamos el orden aleatorio
		if(randomTargets){
			targets_data = self.shuffleArray(targets_data);
		} else {
			// En caso contrario, se utiliza la propiedad target, dentro del array de data
			targets_data.sort(function (a, b) {
				return ((a.target < b.target) ? -1 : ((a.target > b.target) ? 1 : 0));
			});
		}

		var _index = 1; // índice que se le asignará a cada uno de los elementos

		ko.utils.arrayForEach(targets_data, function (item) {
			// Creamos el nuevo target. Añadimos un índice para hacer la relación 1 a 1
			item._items = ko.observableArray();
			if (opt.hasOwnProperty("chancesPerItem")) {
				item.chances = opt.chancesPerItem - 1;
			}
			item._items._id = _index++;

			self.targets.push(item);
		});
		// ======================================================================================
		// FIN Constructor
		// ======================================================================================

		/**
		 * Reproduce el audio de la instrucción.
		 */
		self.playAudio = function () {
			$('#audio-instruction')[0].play();
		};

		// Define si el target esta lleno utilizando self.maximumElements
		self.isContainerFull = function (parent) {
			return parent().length < self.maximumElements;
		};

		// Función que se ejecuta cuando se suelta el elemento y hace toda la funcionalidad
		self.verifyAnswer = function (arg) {
			var parent = arg.targetParent,
			item = arg.item;

			// Si el target es igual al contenedor inicial, se devuelve a su posición original
			if(typeof parent._id === "undefined") {
				arg.cancelDrop = true;
				return;
			} else {
				// Compara el _id para encontrar la pareja idéntica. Si es igual, la respuesta es correcta
				if(parent._id === item._items._id){

					// RESPUESTA CORRECTA
					self.rightAnswers++;
					self.rightAnswer(item);
          			completedItems += 1;
          			// Reducimos en 1 las posibilidades
					chances -= 1;

					// Si se definió una función cuando la respuesta es correcta, se corre
					if(typeof opt.rightAnswerCallback !== "undefined" ) opt.rightAnswerCallback(item);

				} else {

					// RESPUESTA INCORRECTA
					self.wrongAnswer(item);
					arg.cancelDrop = true;

					if (item.hasOwnProperty("chances")) {
						if(item.chances === 0){
							// Reducimos en 1 las posibilidades
							chances -= 1;
							$("#" + item._items._id).hide(200);
			        	}else{item.chances--;}
					} else {
						// Reducimos en 1 las posibilidades
						chances -= 1;
					}
				}
			}

			// La actividad termina cuando el número de posibilidades se termina
			if(chances === 0 || completedItems === self.targets().length) {
				// Si el número de respuestas correctas es mayor o igual al requerido inicialmente
				if(self.rightAnswers >= minRightAnswers) {
					self.success(true); // Trigger de éxito

					// Se llama la función de éxito, definida por el desarrollador
					if (typeof opt.successCallback !== "undefined") opt.successCallback();

					$rootScope.isNextEnabled = true; // Activamos el siguiente
				} else {
					self.failure(true); // Trigger de fracaso
				}
			}
		};

    /**
     * Estilos de los elementos.
     */
     var _itemIndex = 0;
    self.getItemStyles = function (item) {
      var styles = '';

     //  if (opt.hasOwnProperty("itemsPerRow")) {
     //  	if (_itemIndex === opt.itemsPerRow) {
     //  		_itemIndex = 0;
     //  	}

     //  	if (item._index >= opt.itemsPerRow) {
  			// styles += 'top: 33%;';
     //  	}
     //  	styles += 'width: ' + (100 / opt.itemsPerRow) + '%;';
     //  	styles += 'left: ' + ((100 / opt.itemsPerRow) * _itemIndex ) + '%;';
     //  	_itemIndex++
     //  } else {
      	styles += 'width: ' + (100 / self.targets().length) + '%;';
      

      
      	styles += 'left: ' + ((100 / self.targets().length) * item._index ) + '%;';
      // }
      
      styles += 'position: absolute;';
      return styles;
    };

    /**
     * Estilos de cada objetivo.
     * @returns {string}
     */
    self.getTargetStyles = function () {
      var styles = '';

      if (opt.hasOwnProperty("itemsPerRow")) {
  		styles += 'width: ' + (100 / opt.itemsPerRow) + '%;';
      } else {
      	styles += 'width: ' + (100 / self.targets().length) + '%;';
      }
      
      if(typeof opt.targetStyles !== "undefined") styles += opt.targetStyles;

      return styles;
    };

		/**
		 * Estilos para elementos internos de target e item.
		 */
		self.getInnerStyles = function (item) {
			var styles = '';

			// Estilos Opcionales
			if(border) styles += 'border: 4px solid #000;';
			if(padding) styles += 'padding: 4px;';

			return styles;
		}

	};

	/**
	 * Inicializa la instancia del ViewModel creado con pairsActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	pairsActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return pairsActivity;

});

lizPairs.directive('pairs', function  (pairsActivity) {
	return {
		restrict: 'E',
		transclude: true,
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			titletop: '@',
			customClass: '@'
		},
		templateUrl: '../views/activities/pairs.html',
		link: function postLink(scope, element, attrs) {

			if(typeof scope.customClass !== "undefined"){
				scope.$root.customClass = scope.customClass;
			}

			// Definimos los contenedores y los elementos transcluídos
			var itemChildren = element.find('.transcluded item').children(),
			itemContainer = element.find('.item'),
			targetChildren = element.find('.transcluded target').children(),
			targetContainer = element.find('.target')
			itemTargetChildren = element.find('.transcluded item-target').children(),
			itemTargetContainer = element.find('.item-target');

			// Se añade cada uno de los hijos a la plantilla en la posición adecuada
			angular.forEach(itemChildren, function (elem) { itemContainer.append(elem); });
			angular.forEach(targetChildren, function (elem) { targetContainer.append(elem); });
			angular.forEach(itemTargetChildren, function (elem) { itemTargetContainer.append(elem); });

			// Se elimina el elemento transcluded del DOM
			element.find('.transcluded').remove();

			// Añadimos el audio a options
			scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;

			// Corremos la aplicación
			var vm = pairsActivity.create(scope.options);
			pairsActivity.run(vm);
		}
	}; 
});

var lizPairsInputs = angular.module('lizPairsInputs', []);

lizPairsInputs.directive('pairsInputs', function ($timeout) {
	return {
		restrict: 'E',
		templateUrl: '../views/activities/pairs_inputs.html',
		scope: {
			options: "=",
			title: '@',
			description: '@',
			img: '@',
			alt: '@',
			audio:'@',
			theme: '@'
		},
		link: function postLink(scope, element, attrs) {
			var opt = scope.options,
				minRightAnswers = opt.minRightAnswers,
				rightAnswers = 0,
				completedInputs = 0, // Contador para encontrar el fin de la actividad
				inputWidth = opt.hasOwnProperty('inputWidth') ? opt.inputWidth : false;

			attrs.$observe( 'theme', function(val) {
				if ( !angular.isDefined( val ) ) {
					scope.theme = 'default';
				}
			});

			scope.items = opt.items; // parejas de inputs
			scope.success = false; 
			scope.failure = false;

			// Constructor de items
			scope.items.forEach(function (item) {
				item._input = ''; // Modelo que se vincula al input 
				item.chances = opt.chancesPerInput; // Posibilidades por cada input
			});

			/**
			 * Verifica si el input cumple con las condiciones del número 
			 */
			scope.verify = function (item) {
				if(item._input === '') return; 

				// Si se ha llenado el input con los dígitos necesarios
				if(item.input.length === item._input.length){

					// Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
					if(item.input === item._input){
						rightAnswers++; // aumenta las respuestas correctas
						item.wrong = false; // Pasa a falso, para ocultarlo
						item.right = true; 
					} else {
						item.wrong = true;
						item._input = '';
						item.chances--;
					}

					// Termina y bloquea
					if(item.chances === 0 || item.right){
						item.completed = true; // marcamos el item como completo, para desactivar el input
						completedInputs++;
					}
					
					// fin de la actividad
					if(scope.items.length === completedInputs){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} 
					
				} // if
			}; // verify()


			/*
			 * Devuelve los estilos de los inputs
			 */
			scope.getInputStyles = function () {
				var styles = '';

				if(inputWidth){
					styles += "width: " + inputWidth + ';';
				}

				return styles;
			};

		}
	};
});

var lizPairsSquares = angular.module('lizPairsSquares', []);

// Knockout Pairs Factory
lizPairsSquares.factory('pairsSquaresActivity', function ($rootScope, shuffleArrayFactory) {

	var pairsSquaresActivity = {};

	/**
	 * Crea el ViewModel
	 */
	pairsSquaresActivity.create = function (options) {
		return new pairsSquaresActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		options						Opciones a utilizar.
	 * @param {Array}		options.data				Información de los elementos. Dentro de cada objeto, se pueden definir las propiedades:
	 *
	 *	target: Permite darle un orden apropiado a los targets. Debe empezar desde 0 y la propiedad options.randomTargets debe estar desactivada
	 *
	 * @param {integer}		options.pairs				Número de parejas a colocar
	 * @param {integer}		options.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		options.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {function}	options.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	options.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 *
	 */
	pairsSquaresActivity._ViewModel = function (options) {
		var self = this;

		/**
		 * Usamos una clase especial para poder definir las parejas
		 */
		self.Pair = function (options) {
			this.container1 = ko.observableArray();
			this.container2 = ko.observableArray();

			this.container1._id = 1;
			this.container2._id = 2;

			this.container1._parent = this;
			this.container2._parent = this;
		}

		// Inicializa las opciones
		var chances = options.chances ? options.chances : options.items.lenght,
			counter = 0, // Contador para poner los id en los elementos de stack
			pairs = options.pairs,
			item_clone = {}, // Variable auxiliar para clonar el índice
			tempStack = []; // array temporal para stack

		self.pairsArray = ko.observableArray(); // Conjunto de parejas

		self.stack = ko.observableArray(); // Pila de elementos arrastrables

		// Alimentamos el array de parejas
		for (var i=0; i < pairs; i++) {
			self.pairsArray.push(new self.Pair({}));
		}

		// tomamos los items para crear el stack
		ko.utils.arrayForEach(options.items, function(item){
			// Si no tiene la propiedad answer, se define en falso
			if(! item.hasOwnProperty('answer')) item.answer = false;


			if(item.answer){
				item._id = ++counter;

				// Creamos un clon del elemento para añadirlo con otro serial
				item_clone = $.extend(true, {}, item);

				delete item_clone.answer;
				item_clone.serial = (Math.random() + 1).toString(36).substring(7);
				tempStack.push(item_clone); // Debemos agregarlo dos veces para así crear la pareja

			} else {
				item._id = -1;
			}

			delete item.answer; // Elimina el elemento answer
			item.serial = (Math.random() + 1).toString(36).substring(7); // añade una clave única
			tempStack.push(item);

		});

		// Añadimos los elementos al stack (observableArray)
		self.stack(shuffleArrayFactory.run(tempStack));

		// Carpeta de recursos desde angular
		self.resources = $rootScope.resources;

		self.maximumElements = 1; // IMPORTANTE: Requerido para que los sortables no acepten más de un elemento
		self.rightAnswers = 0; // Inicializamos el número de respuestas buenas a 0

		// Triggers que se activan cuando la respuesta es correcta/incorrecta
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
		self.failure = ko.observable(false);
		self.success = ko.observable(false);

		// Define si el target esta lleno utilizando self.maximumElements
		self.isContainerFull = function (parent) {
			return parent().length < self.maximumElements;
		};

		// Función que se ejecuta cuando se suelta el elemento y hace toda la funcionalidad
		self.verifyAnswer = function (arg) {
			var item = arg.item,
			parent = arg.targetParent._parent,
			comparedItem = {};

			// Si se trata del stack, salimos
			if(arg.targetParent === arg.sourceParent) return;

			// si el elemento pertenece a una pareja
			if(item._id > 0){
				// Si ambos cuadros tienen elementos
				if(parent.container1().length || parent.container2().length){
					// Aquí, comparamos los elementos para ver si la respuesta es correcta o incorrecta
					if(parent.container1().length) comparedItem = parent.container1()[0];
					if(parent.container2().length) comparedItem = parent.container2()[0];

					if(comparedItem._id === item._id){
						// Respuesta Correcta
						self.rightAnswer(item);
						self.rightAnswers++;
					} else {
						// Respuesta Incorrecta
						self.wrongAnswer(item);
						arg.cancelDrop = true;
					}
				}
			} else {
				// respuesta mala desde el inicio
				self.wrongAnswer(item);
				arg.cancelDrop = true;
			}

			// Reducimos en 1 las posibilidades
			chances--;

			// La actividad termina cuando el número de posibilidades se termina
			if(chances === 0) {
				// Si el número de respuestas correctas es mayor o igual al requerido inicialmente
				if(self.rightAnswers >= options.minRightAnswers) {
					// Trigger de éxito
					self.success(true);

					// Se llama la función de éxito, definida por el desarrollador
					if (typeof options.successCallback !== "undefined") options.successCallback();

					// Activamos el siguiente
					$rootScope.isNextEnabled = true;

				} else {
					// Trigger de fracaso
					self.failure(true);
				}
			}


		};

};

	/**
	 * Inicializa la instancia del ViewModel creado con pairsSquaresActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	pairsSquaresActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return pairsSquaresActivity;

});


lizPairsSquares.directive('pairsSquares', function  (pairsSquaresActivity) {
	return {
		restrict: 'E',
		transclude: true,
		scope: {
			options: '=',
			description: '@'
		},
		templateUrl: '../views/activities/pairs_squares.html',
		link: function postLink(scope, element, attrs) {

			// Definimos los contenedores y los elementos transcluídos
			var square1Container = element.find('.square1 .item'),
			square2Container = element.find('.square2 .item'),
			itemContainer = element.find('.stack .item');

			// Se añade cada uno de los hijos a la plantilla en la posición adecuada
			angular.forEach(element.find('.transcluded item').clone().children(), function (elem) { square1Container.append(elem); });
			angular.forEach(element.find('.transcluded item').clone().children(), function (elem) { square2Container.append(elem); });
			angular.forEach(element.find('.transcluded item').clone().children(), function (elem) { itemContainer.append(elem); });

			// Se elimina el elemento transcluded del DOM
			element.find('.transcluded').remove();

			// Corremos la aplicación
			var vm = pairsSquaresActivity.create(scope.options);
			pairsSquaresActivity.run(vm);
		}
	}; 
});

var lizPairsWithMessage = angular.module('lizPairsWithMessage', []);

// Knockout Pairs Factory
lizPairsWithMessage.factory('pairsActivity', function ($rootScope) {

    var pairsActivity = {};

    /**
     * Crea el ViewModel
     */
    pairsActivity.create = function (options) {
        return new pairsActivity._ViewModel(options);
    };

    /**
     * Genera el ViewModel de las parejas con sus funcionalidades
     *
     * Recibe un objeto con las siguientes propiedades
     *
     * @param {object}		opt						Opciones a utilizar.
     * @param {Array}			opt.data				Información de los elementos. Dentro de cada objeto, se pueden definir las propiedades:
     *
     *	target: Permite darle un orden apropiado a los targets. Debe empezar desde 0 y la propiedad opt.randomTargets debe estar desactivada
     *
     * @param {integer}		opt.chances				Número de posibilidades que tiene el usuario de hacer la actividad
     * @param {integer}		opt.minRightAnswers		Número mínimo de respuestas correctas
     * @param {boolean}		opt.randomItems			Define si los elementos deben ser puestos en forma aleatoria
     * @param {boolean}		opt.randomTargets		Define si los objetivos debe ser puestos en forma aleatoria
     * @param {function}	opt.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
     * @param {function}	opt.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
     *
     */
    pairsActivity._ViewModel = function (opt) {
        var self = this;

        // ordena el array de forma aleatoria usando el algoritmo de Fisher-Yates
        self.shuffleArray = function(array) {
            for (var i = array.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
            return array;
        };

        // Inicializa las opciones
        var data = opt.data,
            minRightAnswers = opt.minRightAnswers ? opt.minRightAnswers : data.length,
            randomItems = opt.randomItems ? true : false,
            randomTargets = opt.randomTargets ? true : false,
            chances = opt.chances ? opt.chances : data.length,
            targets_data = data.slice(0),   // Clonamos el array para empezar a trabajar
            completedItems = 0, // contador de elementos completos
            border = opt.hasOwnProperty('border') ? opt.border : true,
            padding = opt.hasOwnProperty('padding') ? opt.padding : true;

        // Objetos aleatorios
        if(randomItems) {
            data = self.shuffleArray(data);
        }

        // Creamos los índices para la posición absoluta
        for(var i = 0; i < data.length; i++){
            data[i]._index = i;
        }

        self.itemsPerRow = (opt.hasOwnProperty("itemsPerRow")) ? opt.itemsPerRow : opt.data.length;

        // audio
        self.audio = ko.observable(opt.audio);

        // Definimos los observableArrays para items y targets
        self.items = ko.observableArray(data);
        self.targets = ko.observableArray();

        // Carpeta de recursos desde angular
        self.resources = $rootScope.resources;

        self.maximumElements = 1; // IMPORTANTE: Requerido para que los sortables no acepten más de un elemento
        self.rightAnswers = 0; // Inicializamos el número de respuestas buenas a 0

        // Triggers que se activan cuando la respuesta es correcta/incorrecta
        self.rightAnswer = ko.observable();
        self.wrongAnswer = ko.observable();

        // Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
        self.failure = ko.observable(false);
        self.success = ko.observable(false);

        // ======================================================================================
        // Constructor de los targets
        // ======================================================================================

        // Si la opción de randomTargets está activada, aplicamos el orden aleatorio
        if(randomTargets){
            targets_data = self.shuffleArray(targets_data);
        } else {
            // En caso contrario, se utiliza la propiedad target, dentro del array de data
            targets_data.sort(function (a, b) {
                return ((a.target < b.target) ? -1 : ((a.target > b.target) ? 1 : 0));
            });
        }

        var _index = 1; // índice que se le asignará a cada uno de los elementos

        ko.utils.arrayForEach(targets_data, function (item) {
            // Creamos el nuevo target. Añadimos un índice para hacer la relación 1 a 1
            item._items = ko.observableArray();
            if (opt.hasOwnProperty("chancesPerItem")) {
                item.chances = opt.chancesPerItem - 1;
            }
            item._items._id = _index++;

            self.targets.push(item);
        });
        // ======================================================================================
        // FIN Constructor
        // ======================================================================================

        /**
         * Reproduce el audio de la instrucción.
         */
        self.playAudio = function () {
            $('#audio-instruction')[0].play();
        };

        // Define si el target esta lleno utilizando self.maximumElements
        self.isContainerFull = function (parent) {
            return parent().length < self.maximumElements;
        };

        // Función que se ejecuta cuando se suelta el elemento y hace toda la funcionalidad
        self.verifyAnswer = function (arg) {

            var parent = arg.targetParent,
                item = arg.item;

            // Si el target es igual al contenedor inicial, se devuelve a su posición original
            if(typeof parent._id === "undefined") {
                arg.cancelDrop = true;
                return;
            } else {
                // Compara el _id para encontrar la pareja idéntica. Si es igual, la respuesta es correcta
                if(parent._id === item._items._id){

                    // RESPUESTA CORRECTA
                    self.rightAnswers++;
                    self.rightAnswer(item);
                    completedItems += 1;
                    // Reducimos en 1 las posibilidades
                    chances -= 1;

                    // Si se definió una función cuando la respuesta es correcta, se corre
                    if(typeof opt.rightAnswerCallback !== "undefined" ) opt.rightAnswerCallback(item);

                } else {

                    // RESPUESTA INCORRECTA
                    self.wrongAnswer(item);
                    arg.cancelDrop = true;

                    if (item.hasOwnProperty("chances")) {
                        if(item.chances === 0){
                            // Reducimos en 1 las posibilidades
                            chances -= 1;
                            $("#" + item._items._id).hide(200);
                        }else{item.chances--;}
                    } else {
                        // Reducimos en 1 las posibilidades
                        chances -= 1;
                    }
                }
            }

            // La actividad termina cuando el número de posibilidades se termina
            if(chances === 0 || completedItems === self.targets().length) {
                // Si el número de respuestas correctas es mayor o igual al requerido inicialmente
                if(self.rightAnswers >= minRightAnswers) {
                    self.success(true); // Trigger de éxito

                    // Se llama la función de éxito, definida por el desarrollador
                    if (typeof opt.successCallback !== "undefined") opt.successCallback();

                    $rootScope.isNextEnabled = true; // Activamos el siguiente
                } else {
                    self.failure(true); // Trigger de fracaso
                }
            }
        };

        /**
         * Estilos de los elementos.
         */
        var _itemIndex = 0;
        self.getItemStyles = function (item) {
            var styles = '';

            //  if (opt.hasOwnProperty("itemsPerRow")) {
            //  	if (_itemIndex === opt.itemsPerRow) {
            //  		_itemIndex = 0;
            //  	}

            //  	if (item._index >= opt.itemsPerRow) {
            // styles += 'top: 33%;';
            //  	}
            //  	styles += 'width: ' + (100 / opt.itemsPerRow) + '%;';
            //  	styles += 'left: ' + ((100 / opt.itemsPerRow) * _itemIndex ) + '%;';
            //  	_itemIndex++
            //  } else {
            styles += 'width: ' + (100 / self.targets().length) + '%;';



            styles += 'left: ' + ((100 / self.targets().length) * item._index ) + '%;';
            // }

            styles += 'position: absolute;';
            return styles;
        };

        /**
         * Estilos de cada objetivo.
         * @returns {string}
         */
        self.getTargetStyles = function () {
            var styles = '';

            if (opt.hasOwnProperty("itemsPerRow")) {
                styles += 'width: ' + (100 / opt.itemsPerRow) + '%;';
            } else {
                styles += 'width: ' + (100 / self.targets().length) + '%;';
            }

            if(typeof opt.targetStyles !== "undefined") styles += opt.targetStyles;

            return styles;
        };

        /**
         * Estilos para elementos internos de target e item.
         */
        self.getInnerStyles = function (item) {
            var styles = '';

            // Estilos Opcionales
            if(border) styles += 'border: 4px solid #000;';
            if(padding) styles += 'padding: 4px;';

            return styles;
        }

    };

    /**
     * Inicializa la instancia del ViewModel creado con pairsActivity.create
     *
     * @param {object} instance Intancia del VM de knockout
     */
    pairsActivity.run = function (instance) {
        ko.cleanNode($('#main-container')[0]);
        ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
        ko.applyBindings(instance, $('#main-container')[0]);
    };

    return pairsActivity;

});

lizPairsWithMessage.directive('pairsWithMessage', function  (pairsActivity) {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            options: '=',
            description: '@',
            audio:'@',
            titletop: '@',
            customClass: '@'
        },
        templateUrl: '../views/activities/pairs_with_message.html',
        link: function postLink(scope, element, attrs) {

            if(typeof scope.customClass !== "undefined"){
                scope.$root.customClass = scope.customClass;
            }

            // Definimos los contenedores y los elementos transcluídos
            var itemChildren = element.find('.transcluded item').children(),
                itemContainer = element.find('.item'),
                targetChildren = element.find('.transcluded target').children(),
                targetContainer = element.find('.target')
            itemTargetChildren = element.find('.transcluded item-target').children(),
                itemTargetContainer = element.find('.item-target');

            // Se añade cada uno de los hijos a la plantilla en la posición adecuada
            angular.forEach(itemChildren, function (elem) { itemContainer.append(elem); });
            angular.forEach(targetChildren, function (elem) { targetContainer.append(elem); });
            angular.forEach(itemTargetChildren, function (elem) { itemTargetContainer.append(elem); });

            // Se elimina el elemento transcluded del DOM
            element.find('.transcluded').remove();

            // Añadimos el audio a options
            scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;

            // Corremos la aplicación
            var vm = pairsActivity.create(scope.options);
            pairsActivity.run(vm);
        }
    };
});

var lizPuzzle1 = angular.module('lizPuzzle1', []);

// Knockout Puzzle1 Factory
lizPuzzle1.factory('puzzle1Activity', function ($rootScope) {

  var puzzle1Activity = {};

  /**
   * Crea el ViewModel
   */
  puzzle1Activity.create = function (options) {
    return new puzzle1Activity._ViewModel(options);
  }

  /**
   * Genera el ViewModel de las parejas con sus funcionalidades
   *
   * Recibe un objeto con las siguientes propiedades
   *
   * @param {object}    options            Opciones a utilizar.
   * @param {Array}    options.data        Información de los elementos. Dentro de cada objeto, se pueden definir las propiedades:
   *
   *  target: Permite darle un orden apropiado a los targets. Debe empezar desde 0 y la propiedad options.randomTargets debe estar desactivada
   *
   * @param {integer}    options.chances        Número de posibilidades que tiene el usuario de hacer la actividad
   * @param {integer}    options.minRightAnswers    Número mínimo de respuestas correctas
   * @param {boolean}    options.randomItems      Define si los elementos deben ser puestos en forma aleatoria
   * @param {boolean}    options.randomTargets    Define si los objetivos debe ser puestos en forma aleatoria
   * @param {function}  options.successCallback    Función que se llama cuando se termina la actividad de forma satisfactoria
   * @param {function}  options.rightAnswerCallback  Función que se llama cuando la respuesta es correcta
   *
   */
  puzzle1Activity._ViewModel = function (options) {
    var self = this;

    // Inicializa las opciones
    var items = options.items,
      minRightAnswers = options.minRightAnswers ? options.minRightAnswers : items.length,
      chances = options.chances ? options.chances : items.length;

    // Definimos los observableArrays para items
    self.items = ko.observableArray(items);

    // Añadimos a cada item la propiedad answer: true si no está definida. (por defecto)
    ko.utils.arrayForEach(self.items(), function (item) {
      if (typeof item.answer === "undefined")
        item.answer = true;
    });

    self.canvas = ko.observableArray(); // Donde caen las imágenes

    self.rightAnswers = 0; // Inicializamos el número de respuestas buenas a 0

    self.resources = $rootScope.resources;
    self.audio = ko.observable(options.audio);

    // Triggers que se activan cuando la respuesta es correcta/incorrecta
    self.rightAnswer = ko.observable();
    self.wrongAnswer = ko.observable();

    // Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
    self.failure = ko.observable(false);
    self.success = ko.observable(false);

    /**
     * Reproduce el audio de la instrucción.
     */
    self.playAudio = function () {
      $('#audio-instruction')[0].play();
    };

    // Función que se ejecuta cuando se suelta el elemento y hace toda la funcionalidad
    self.verifyAnswer = function (arg) {
      var item = arg.item;

      if (arg.sourceParent === arg.targetParent) return;

      if (item.answer === true) {

        // RESPUESTA CORRECTA
        self.rightAnswers++;
        self.rightAnswer(item);

        // Si se definió una función cuando la respuesta es correcta, se corre
        if (typeof options.rightAnswerCallback !== "undefined") options.rightAnswerCallback(item);

      } else {

        // RESPUESTA INCORRECTA
        self.wrongAnswer(item);
        arg.cancelDrop = true;

      }

      // Reducimos en 1 las posibilidades
      chances--;

      // La actividad termina cuando el número de posibilidades se termina
      if (chances === 0) {
        // Si el número de respuestas correctas es mayor o igual al requerido inicialmente
        if (self.rightAnswers >= minRightAnswers) {

          // Trigger de éxito
          self.success(true);

          $rootScope.isNextEnabled = true;

          // Se llama la función de éxito, definida por el desarrollador
          if (typeof options.successCallback !== "undefined") options.successCallback();

        } else {

          // Trigger de fracaso
          self.failure(true);

        }
      }
    };
  };

  /**
   * Inicializa la instancia del ViewModel creado con puzzle1Activity.create
   *
   * @param {object} instance Intancia del VM de knockout
   */
  puzzle1Activity.run = function (instance) {
    ko.cleanNode($('#main-container')[0]);
    ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
    ko.applyBindings(instance, $('#main-container')[0]);
  };

  return puzzle1Activity;

});


lizPuzzle1.directive('puzzle1', function (puzzle1Activity) {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      options: '=',
      description: '@',
      audio: '@'
    },
    templateUrl: '../views/activities/puzzle1.html',
    link: function postLink(scope, element, attrs) {
      // Añadimos el audio a options
      scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;

      // Corremos la aplicación
      puzzle1Activity.run(puzzle1Activity.create(scope.options));
    }
  };
});



var lizPuzzle2 = angular.module('lizPuzzle2', []);

// Knockout Puzzle2 Factory
lizPuzzle2.factory('puzzle2Activity', function ($rootScope) {

	var puzzle2Activity = {};

	/**
	 * Crea el ViewModel
	 */
	puzzle2Activity.create = function (options) {
		return new puzzle2Activity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		options						Opciones a utilizar.
	 * @param {Array}		options.data				Información de los elementos. Dentro de cada objeto, se pueden definir las propiedades:
	 *
	 *	target: Permite darle un orden apropiado a los targets. Debe empezar desde 0 y la propiedad options.randomTargets debe estar desactivada
	 *
	 * @param {integer}		options.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		options.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {boolean}		options.randomItems			Define si los elementos deben ser puestos en forma aleatoria
	 * @param {boolean}		options.randomTargets		Define si los objetivos debe ser puestos en forma aleatoria
	 * @param {function}	options.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	options.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 *
	 */
	puzzle2Activity._ViewModel = function (options) {
		var self = this;

		// Inicializa las opciones
		var targets = options.targets,
				minRightAnswers = options.minRightAnswers ? options.minRightAnswers : targets.length,
				chances = options.chances ? options.chances : targets.length;

		// Main Observables
		self.trap = ko.observableArray([]); // Capa base donde caen los elementos si no aciertan los targets
		self.trap._id = 'trap';

		self.canvas = options.canvas; // La imagen en sí
		self.items = ko.observableArray(options.targets); // Sortable de círculos arrastrar
		self.targets = ko.observableArray(options.targets); // Sortable de targets

		// Constructor para los targets
		ko.utils.arrayForEach(self.targets(), function(target){
				target._targets = ko.observableArray();
				target._targets._id = 'target';
		});

		self.rightAnswers = 0; // Inicializamos el número de respuestas buenas a 0
		self.maximumElements = 1; // Número máximo de elementos

		self.resources = $rootScope.resources;

		// Triggers que se activan cuando la respuesta es correcta/incorrecta
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
		self.failure = ko.observable(false);
		self.success = ko.observable(false);

		/**
		 * Previene la posibilidad de lanzar más de un elemento
		 */
		self.isContainerFull = function (parent) {
			return parent().length < self.maximumElements;
		};

		/**
		 * Devuelve los estilos según el elemento
		 */
		self.getStyles = function (item) {
			var styles = '';

			styles += 'width: ' + item.w + '%;';
			styles += 'height: ' + item.h + '%;';
			styles += 'top: ' + item.t + '%;';
			styles += 'left: ' + item.l + '%;';

			return styles;
		}

		// Función que se ejecuta cuando se suelta el elemento y hace toda la funcionalidad
		self.verifyAnswer = function (arg) {
			var item = arg.item;

			// Si es el mismo elemento inicial, salimos de la función
			if(arg.sourceParent === arg.targetParent) return;

			// Si cae en la trampa, esta malo
			if(arg.targetParent._id === 'trap'){
				// RESPUESTA INCORRECTA
				self.wrongAnswer(item);
				arg.cancelDrop = true;
			}

			// Si cae en un target, es correcto
			if(arg.targetParent._id === 'target'){
				// RESPUESTA CORRECTA
				self.rightAnswers++;
				self.rightAnswer(item);

				// Si se definió una función cuando la respuesta es correcta, se corre
				if(typeof options.rightAnswerCallback !== "undefined" ) options.rightAnswerCallback(item);
			}

			// Reducimos en 1 las posibilidades
			chances--;

			// La actividad termina cuando el número de posibilidades se termina
			if(chances === 0) {
				// Si el número de respuestas correctas es mayor o igual al requerido inicialmente
				if(self.rightAnswers >= minRightAnswers) {
					self.success(true); // Trigger de éxito
					$rootScope.isNextEnabled = true;
					if (typeof options.successCallback !== "undefined") options.successCallback(); // Se llama la función de éxito, definida por el desarrollador
				} else {
					// Trigger de fracaso
					self.failure(true);
				}
			}
		};

		};

		/**
		 * Inicializa la instancia del ViewModel creado con puzzle2Activity.create
		 *
		 * @param {object} instance Intancia del VM de knockout
		 */
		puzzle2Activity.run = function (instance) {
			ko.cleanNode($('#main-container')[0]);
			ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
			ko.applyBindings(instance, $('#main-container')[0]);
		};

		return puzzle2Activity;

});


lizPuzzle2.directive('puzzle2', function  (puzzle2Activity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			description: '@',
			audio: '@'
		},
		templateUrl: '../views/activities/puzzle2.html',
		link: function postLink(scope, element, attrs) {

			// Corremos la aplicación
			puzzle2Activity.run(puzzle2Activity.create(scope.options));
		}
	}; 
});



var lizPuzzle3 = angular.module('lizPuzzle3', []);

// Knockout Puzzle2 Factory
lizPuzzle3.factory('puzzle3Activity', function ($rootScope, shuffleArrayFactory) {

	var puzzle3Activity = {};

	/**
	 * Crea el ViewModel
	 */
	puzzle3Activity.create = function (options) {
		return new puzzle3Activity._ViewModel(options);
	}

    /**
     * Genera el ViewModel de las parejas con sus funcionalidades
     *
     * Recibe un objeto con las siguientes propiedades
     *
     * @param {object}		options						Opciones a utilizar.
     * @param {Array}		options.data				Información de los elementos. Dentro de cada objeto, se pueden definir las propiedades:
     *
     *	target: Permite darle un orden apropiado a los targets. Debe empezar desde 0 y la propiedad options.randomTargets debe estar desactivada
     *
     * @param {integer}		options.chances				Número de posibilidades que tiene el usuario de hacer la actividad
     * @param {integer}		options.minRightAnswers		Número mínimo de respuestas correctas
     * @param {boolean}		options.randomItems			Define si los elementos deben ser puestos en forma aleatoria
     * @param {boolean}		options.randomTargets		Define si los objetivos debe ser puestos en forma aleatoria
     * @param {function}	options.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
     * @param {function}	options.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
     *
      */
    puzzle3Activity._ViewModel = function (options) {
        var self = this,
			coordinates = [],
			rows = options.rows,
			cols = options.cols,
			cells = rows * cols;

		/**
		 * Clase para los sortables
		 */
		self.Sortable = function (row, col) {
			this.row = row;
			this.col = col;
			this.puzzleBlock = ko.observableArray([ { row: i, col: j } ]);
			this.puzzleBlock._id = 'sortable';
		}

		/**
		 * Clase para los sortables
		 */
		self.Target = function (row, col) {
			this.row = row;
			this.col = col;
			this.puzzleBlock = ko.observableArray([]);

			// Necesarios para la comparación en beforeMove
			this.puzzleBlock.row = row;
			this.puzzleBlock.col = col;
		}

        // Inicializa las opciones
		var minRightAnswers = options.minRightAnswers ? options.minRightAnswers : cells,
			chances = options.chances ? options.chances : cells;

		// Constructor para las celdas
		self.items = ko.observableArray();
		self.targets = ko.observableArray();
		self.image = options.image;

		// Creamos los objetos para definir su posición en cada fila
		for(var i = 0; i < rows; i++){
			for(var j = 0; j < cols; j++){
				// Las propiedades son fila y columna, usadas para definir posteriormente los estilos
				self.items.push(new self.Sortable(i, j));
				self.targets.push(new self.Target(i, j));

				// almacenamos las coordenadas en un array que después desorganizaremos
				coordinates.push({ row: i, col: j });
			}
		}

		// Organizamos aleatoriamente el array
		coordinates = shuffleArrayFactory.run(coordinates);

		// Procedemos a cambiar las coordenadas
		for(var i = 0; i < self.items().length; i++){
			self.items()[i].row = coordinates[i].row;
			self.items()[i].col = coordinates[i].col;
		}


        self.rightAnswers = 0; // Inicializamos el número de respuestas buenas a 0
        self.maximumElements = 1; // Número máximo de elementos

        self.resources = $rootScope.resources;

		// Triggers que se activan cuando la respuesta es correcta/incorrecta
        self.rightAnswer = ko.observable();
        self.wrongAnswer = ko.observable();

		// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
        self.failure = ko.observable(false);
        self.success = ko.observable(false);

		/**
		 * Previene la posibilidad de lanzar más de un elemento
		 */
        self.isContainerFull = function (parent) {
            return parent().length < self.maximumElements;
        };

        /**
         * Devuelve los estilos del sortable
         */
        self.getSortableStyles = function (sortable) {
        	var styles = '';

			// El tamaño se divide según el número de columnas y filas
        	styles += 'width: ' + (100 / cols) + '%;';
        	styles += 'height: ' + (100 / rows) + '%;';

			// Top y Left
        	styles += 'left: ' + (sortable.col * (100 / cols)) + '%;';
        	styles += 'top: ' + (sortable.row * (100 / rows)) + '%;';

        	return styles;
        }

        /**
         * Devuelve los estilos según el elemento
         */
        self.getItemStyles = function (item) {
        	var styles = '';

        	styles += 'background: url(' + self.resources + '/' + self.image  + '.png) no-repeat;'; // Recurso
            //styles += 'background-size: ' + (100 * cols) + '% ' + (100 * rows) + '%;'; // porcentajes según el número de elementos
        	
            //styles += 'background-position: ' + (( item.col + 1 ) * (100 / cols)) + '% ' + (( item.row + 1 ) * (100 / rows)) + '%;';
        	styles += 'background-position: ';

			if(item.col === 0){
				styles += '0% ';
			} else {
				styles += (item.col * (100 / (cols - 1) )) + '% ';
			}

			if(item.row === 0){
				styles += '0%;';
			} else {
				styles += (item.row * (100 / (rows - 1) )) + '%;';
			}
        	
        	return styles;
        }

		/**
		 * Función que se ejecuta cuando se suelta el elemento y hace toda la funcionalidad
		 */
		self.verifyAnswer = function (arg) {
			var item = arg.item,
				parent = arg.targetParent;

			// Si es el mismo elemento inicial, salimos de la función
			if(arg.sourceParent === parent) return;

			// Si se trata de los elementos iniciales, que vuelvan al padre
			if(parent._id === 'sortable'){
				arg.cancelDrop = true;
				return;
			}

			// Si es target, comparamos los valores
			if (parent.row === item.row && parent.col === item.col) {
				
				// RESPUESTA CORRECTA
				self.rightAnswers++;
				self.rightAnswer(item);

				// Si se definió una función cuando la respuesta es correcta, se corre
				if(typeof options.rightAnswerCallback !== "undefined" ) options.rightAnswerCallback(item);
				
			} else {

				// RESPUESTA INCORRECTA
				self.wrongAnswer(item);
				arg.cancelDrop = true;

			}

			// Reducimos en 1 las posibilidades
			chances--;

			// La actividad termina cuando el número de posibilidades se termina
			if(chances === 0 || self.rightAnswers === self.items.length) {
				// Si el número de respuestas correctas es mayor o igual al requerido inicialmente
				if(self.rightAnswers >= minRightAnswers) {

					// Trigger de éxito
					self.success(true);

					$rootScope.isNextEnabled = true;

					// Se llama la función de éxito, definida por el desarrollador
					if (typeof options.successCallback !== "undefined") options.successCallback();

				} else {

					// Trigger de fracaso
					self.failure(true);

				}
			}
		};
    };

	/**
	 * Inicializa la instancia del ViewModel creado con puzzle3Activity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
    puzzle3Activity.run = function (instance) {
    	ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
    };

	return puzzle3Activity;
    
});


lizPuzzle3.directive('puzzle3', function  (puzzle3Activity) {
    return {
        restrict: 'E',
		scope: {
			options: '=',
			description: '@'
		},
        templateUrl: '../views/activities/puzzle3.html',
		link: function postLink(scope, element, attrs) {

			// Corremos la aplicación
			puzzle3Activity.run(puzzle3Activity.create(scope.options));
        }
    }; 
});



var lizPuzzle4 = angular.module('lizPuzzle4', []);

// Knockout Puzzle2 Factory
lizPuzzle4.factory('puzzle4Activity', function ($rootScope,$sce) {

	var puzzle4Activity = {};

	/**
	 * Crea el ViewModel
	 */
	puzzle4Activity.create = function (options) {
		return new puzzle4Activity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		opt						Opciones a utilizar.
	 * @param {Array}		opt.data				Información de los elementos. Dentro de cada objeto, se pueden definir las propiedades:
	 *
	 *	target: Permite darle un orden apropiado a los targets. Debe empezar desde 0 y la propiedad opt.randomTargets debe estar desactivada
	 *
	 * @param {integer}		opt.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		opt.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {boolean}		opt.randomItems			Define si los elementos deben ser puestos en forma aleatoria
	 * @param {boolean}		opt.randomTargets		Define si los objetivos debe ser puestos en forma aleatoria
	 * @param {function}	opt.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	opt.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 *
	 */
	puzzle4Activity._ViewModel = function (opt) {
		var self = this;

		// Inicializa las opciones
		var targets = opt.targets,
				minRightAnswers = opt.minRightAnswers ? opt.minRightAnswers : targets.length,
				chances = opt.chances ? opt.chances : targets.length;

		// audio
		self.audio = ko.observable(opt.audio);

		self.canvas = opt.canvas ? opt.canvas : false; // La imagen en sí
		self.extcanvas = opt.extcanvas ? opt.extcanvas : '.png'; // La imagen en sí
		self.altcanvas = opt.altcanvas ? opt.altcanvas : false;//texto alternativo de la imagen principal 
		self.maintext = opt.maintext ? opt.maintext : false; // el texto q remplaza la imagen 
		self.maintextstyle = opt.maintextstyle ? opt.maintextstyle : opt.maintext ? false : 'display: none;';
		self.items = ko.observableArray(opt.targets); // Sortable de targets
		self.targets = ko.observableArray(opt.targets); // Sortable de targets
		self.noDrag = opt.noDrag ? opt.noDrag : false;
		self.preserveText = ko.observable(opt.hasOwnProperty('preserveText') ? true : false);
		self.preserveimg = opt.preserveimg ? true : false;

    // Recorremos los items para definir los valores
    self.items().forEach(function (item) {
      item.text = item.hasOwnProperty('text') ? item.text : false;
      item.img = item.hasOwnProperty('img') ? item.img : false;
      item.alt = item.hasOwnProperty('alt') ? item.alt : false;
    });

		// Constructor para los targets
		ko.utils.arrayForEach(self.targets(), function(target){
				target._id = (Math.random() + 1).toString(36).substring(7); // Genera un código aleatorio como id
				target.preserveimg = self.preserveimg;
				
				// Creamos el lugar a donde cae el elemento
				target._targets = ko.observableArray();
				target._targets._id = target._id;
				target._targets._acept= target.acept ? target.acept : false;

		});

		self.rightAnswers = 0; // Inicializamos el número de respuestas buenas a 0
		self.targetslength= targets.length - self.noDrag; // numero de items 
		self.maximumElements = 1; // Número máximo de elementos

		self.resources = $rootScope.resources;

		// Triggers que se activan cuando la respuesta es correcta/incorrecta
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
		self.failure = ko.observable(false);
		self.success = ko.observable(false);


		/**
		 * Reproduce el audio de la instrucción.
		 */
		self.playAudio = function () {
			$('#audio-instruction')[0].play();
		};

		// Para usar el html en angular
		self.sanitize = function (item) {
			return $sce.trustAsHtml(item);
		}

		/**
		 * Previene la posibilidad de lanzar más de un elemento
		 */
		self.isContainerFull = function (parent) {
			return parent().length < self.maximumElements;
		};


		/**
		 * Devuelve los estilos según el elemento
		 */
		self.getItemsContainerStyles = function () {
			var styles = '';

			if(opt.hasOwnProperty('itemsWidth')) styles += "width: " + opt.itemsWidth + ";";

			return styles;
		}


		/**
		 * Devuelve los estilos según el elemento
		 */
		self.getItemsStyles = function (item) {
			var styles = '';

			if(opt.hasOwnProperty('itemsPerRow')){
				styles += "width: " + (98 / opt.itemsPerRow) + "%;";
			} 

			if(opt.hasOwnProperty('itemCustomStyles')) styles += opt.itemCustomStyles;
     		if(item.hasOwnProperty('style')) styles += item.style;

			return styles;
		}


		self.getDroppedStyles = function () {
			var styles = '';

			if(!self.preserveText()) styles += "color: transparent;";
			// agrega solo el tamaño de la fuente de los estilos personalizados (debe estar la propiedad font-size al final de la cadena)
			if(opt.hasOwnProperty('customStyles')){
				if(/font-size/.test(opt.customStyles)) styles += 'font-size:'+ opt.customStyles.substring(opt.customStyles.length - 5,opt.customStyles.length);
			};

			return styles;
		}

		/**
		 * Devuelve los estilos según el elemento
		 */
		self.getTargetsStyles = function (item) {
			var styles = '';

			if(opt.hasOwnProperty('borderColor')) styles += "box-shadow: 0px 0px 0px 3px " + opt.borderColor + ";";
			styles += 'width: ' + item.w + '%;';
			styles += 'height: ' + item.h + '%;';
			styles += 'top: ' + item.t + '%;';
			styles += 'left: ' + item.l + '%;';
			if(item.hasOwnProperty('z')) styles += 'z-index: ' + item.z + ';';

			// estilos personalizados
			if(opt.hasOwnProperty('customStyles')) styles += opt.customStyles;

			return styles;
		}


		/**
		 * Función que se ejecuta cuando se suelta el elemento y hace toda la funcionalidad
		 */
		self.verifyAnswer = function (arg) {
			var item = arg.item,
				parent = arg.targetParent;
				console.log(parent._acept);
			// Si es el mismo elemento inicial, salimos de la función
			if(arg.sourceParent === arg.targetParent) return;

			// Si cae en el mismo elemento, es correcto
			if(parent._id === item._id || (parent._acept!= false && parent._acept.indexOf(item.text) > -1)){
				// RESPUESTA CORRECTA
				self.rightAnswers++;
				self.rightAnswer(item);
				console.log(arg);

				// Si se definió una función cuando la respuesta es correcta, se corre
				if(typeof opt.rightAnswerCallback !== "undefined" ) opt.rightAnswerCallback(item);
			} else {
				// RESPUESTA INCORRECTA
				self.wrongAnswer(item);
				arg.cancelDrop = true;
			}

			// Reducimos en 1 las posibilidades
			chances--;
			// La actividad termina cuando el número de posibilidades se termina
			if(chances === 0 || (self.rightAnswers === self.targetslength)) {
				// Si el número de respuestas correctas es mayor o igual al requerido inicialmente
				if(self.rightAnswers >= minRightAnswers) {
					self.success(true); // Trigger de éxito
					$rootScope.isNextEnabled = true;
					if (typeof opt.successCallback !== "undefined") opt.successCallback(); // Se llama la función de éxito, definida por el desarrollador
				} else {
					// Trigger de fracaso
					self.failure(true);
				}
			}
		};
	};

	/**
	 * Inicializa la instancia del ViewModel creado con puzzle4Activity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	puzzle4Activity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return puzzle4Activity;

});

lizPuzzle4.directive('puzzle4', function  (puzzle4Activity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			description: '@',
			titletop: '@',
			audio:'@',
		},
		templateUrl: '../views/activities/puzzle4.html',
		link: function postLink(scope, element, attrs) {
			// Añadimos el audio a options
			scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;

			// Corremos la aplicación
			puzzle4Activity.run(puzzle4Activity.create(scope.options));
		}
	}; 
});



var lizPuzzle5 = angular.module('lizPuzzle5', []);

// Knockout Puzzle2 Factory
lizPuzzle5.factory('puzzle5Activity', function ($rootScope) {

	var puzzle5Activity = {};

	/**
	 * Crea el ViewModel
	 */
	puzzle5Activity.create = function (options) {
		return new puzzle5Activity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		options						Opciones a utilizar.
	 * @param {Array}		options.data				Información de los elementos. Dentro de cada objeto, se pueden definir las propiedades:
	 *
	 *	target: Permite darle un orden apropiado a los targets. Debe empezar desde 0 y la propiedad options.randomTargets debe estar desactivada
	 *
	 * @param {integer}		options.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		options.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {boolean}		options.randomItems			Define si los elementos deben ser puestos en forma aleatoria
	 * @param {boolean}		options.randomTargets		Define si los objetivos debe ser puestos en forma aleatoria
	 * @param {function}	options.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	options.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 *
	 */
	puzzle5Activity._ViewModel = function (options) {
		var self = this,
			tempItem = {}, // variable auxiliar para añadir nuevos elementos al stack
			stackCounter = 0, // Variable para poner Id's a elementos clonados
			tempStack = []; // Array auxiliar que después será ordenado aleatoriamente

		// Inicializa las opciones
		var targets = options.targets,
				minRightAnswers = options.minRightAnswers ? options.minRightAnswers : targets.length,
				chances = options.chances ? options.chances : targets.length;

		self.canvas = options.canvas; // La imagen en sí
		self.canvasAlt = options.canvasAlt;
		self.items = ko.observableArray(options.targets); // Sortable de targets
		self.targets = ko.observableArray(options.targets); // Sortable de targets

		ko.utils.arrayForEach(self.items(), function (item) {
			item.chances = options.chancesPerItem - 1;
		});
		

		// Constructor para los targets
		ko.utils.arrayForEach(self.targets(), function(target){
				target._id = (Math.random() + 1).toString(36).substring(7); // Genera un código aleatorio como id

				// Creamos el lugar a donde cae el elemento
				target._targets = ko.observableArray();
				target._targets._id = target._id;
		});

		self.rightAnswers = 0; // Inicializamos el número de respuestas buenas a 0
		self.maximumElements = 1; // Número máximo de elementos

		self.resources = $rootScope.resources;

		// Triggers que se activan cuando la respuesta es correcta/incorrecta
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
		self.failure = ko.observable(false);
		self.success = ko.observable(false);

		/**
		 * Previene la posibilidad de lanzar más de un elemento
		 */
		self.isContainerFull = function (parent) {
			return parent().length < self.maximumElements;
		};

		self.playAudio = function () {
			$('#puzzle5-instruction')[0].play();
		};

		/**
		 * Devuelve los estilos según el elemento
		 */
		self.getStyles = function (item) {
			var styles = '';
			var itemWidth = (item.hasOwnProperty("w")) ? item.w + '%;' : "auto;";
			var itemHeight = (item.hasOwnProperty("h")) ? item.h + '%;' : "auto;";
			styles += 'width: ' + itemWidth;
			styles += 'height: ' + itemHeight;
			styles += 'top: ' + item.t + '%;';
			styles += 'left: ' + item.l + '%;';

			return styles;
		};

		var counter = 0,
			numItems = self.items().length;
		// Función que se ejecuta cuando se suelta el elemento y hace toda la funcionalidad
		self.verifyAnswer = function (arg) {;
			var item = arg.item,
				parent = arg.targetParent;

			// Si es el mismo elemento inicial, salimos de la función
			if(arg.sourceParent === arg.targetParent) return;

			// Si cae en el mismo elemento, es correcto
			if(parent._id === item._id){
				// RESPUESTA CORRECTA
				self.rightAnswers++;
				self.rightAnswer(item);
				counter++;
				// Si se definió una función cuando la respuesta es correcta, se corre
				if(typeof options.rightAnswerCallback !== "undefined" ) options.rightAnswerCallback(item);
			} else {
				// RESPUESTA INCORRECTA
				self.wrongAnswer(item);
				arg.cancelDrop = true;

				if(item.chances === 0){
	            	counter++;
	            	$('#' + item._id).hide(200);
            	}else{item.chances--;}
			}

			// La actividad termina cuando el número de posibilidades se termina
			if(numItems === counter) {
				// Si el número de respuestas correctas es mayor o igual al requerido inicialmente
				if(self.rightAnswers >= minRightAnswers) {
					self.success(true); // Trigger de éxito
					$rootScope.isNextEnabled = true;
					if (typeof options.successCallback !== "undefined") options.successCallback(); // Se llama la función de éxito, definida por el desarrollador
				} else {
					// Trigger de fracaso
					self.failure(true);
				}
			}
		};
	};

	/**
	 * Inicializa la instancia del ViewModel creado con puzzle5Activity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	puzzle5Activity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return puzzle5Activity;

});


lizPuzzle5.directive('puzzle5', function  (puzzle5Activity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			audio: "@",
			description: '@'
		},
		templateUrl: '../views/activities/puzzle5.html',
		link: function postLink(scope, element, attrs) {

			// Corremos la aplicación
			puzzle5Activity.run(puzzle5Activity.create(scope.options));
		}
	}; 
});



/**
 * Actividad donde se arma una palabra en orden y luego se valida usando un botón.
 */
var lizPuzzleWord = angular.module('lizPuzzleWord', ['factories']);

// Knockout Pairs Factory
lizPuzzleWord.factory('puzzleWordActivity', function ($rootScope, shuffleArrayFactory) {

  var puzzleWordActivity = {};

  /**
   * Crea el ViewModel
   */
  puzzleWordActivity.create = function (options) {
    return new puzzleWordActivity._ViewModel(options);
  };

  /**
   * Modelo de la actividad.
   */
  puzzleWordActivity._ViewModel = function (opt) {
    var self = this,
      chances = opt.hasOwnProperty('chances') ? opt.chances : opt.word.length,
      minRightAnswers = opt.hasOwnProperty('minRightAnswers') ? opt.minRightAnswers : opt.word.length,
      rightAnswers = 0,
      word = opt.word.split("");


    self.Letter = function (id) {
      this.sortable = ko.observableArray();
      this.sortable.id = id;
    };

    self.audio = ko.observable(opt.audio); // audio
    self.resources = $rootScope.resources; // Carpeta de recursos desde angular
    self.maximumElements = 1; // número máximo de elementos

    self.rightAnswer = ko.observable();
    self.wrongAnswer = ko.observable();
    self.failure = ko.observable(false);
    self.success = ko.observable(false);

    self.img = opt.img; // imagen adicional
    self.letters = ko.observableArray([]);
    self.finalWord = ko.observableArray([]);

    // Constructor
    word.forEach(function (l) {
      var id = (Math.random() + 1).toString(36).substring(7);

      // añadimos cada una de las letras (stack)
      self.letters.push({
        id: id,
        letter: l
      });

      self.finalWord.push(new self.Letter(l));
    });

    // Barajamos el array de letras, mientras que las letras sea diferentes a la respuesta
    var shuffledWord = '';

    do {
      shuffleArrayFactory.run(self.letters());
      shuffledWord = self.letters().map(function (l) {
        return l.letter;
      });
    } while(shuffledWord.join("") === word.join(""));

    /**
     * Reproduce el audio de la instrucción.
     */
    self.playAudio = function () {
      $('#audio-instruction')[0].play();
    };

    /**
     * Define si el target esta lleno utilizando self.maximumElements
     */
    self.isContainerFull = function (parent) {
      return parent().length < self.maximumElements;
    };

    /**
     * Verifica la respuesta después de soltar cada uno de los elementos.
     */
    self.verifyAnswer = function (arg) {
      var parent = arg.targetParent,
        item = arg.item;

      // Si es el mismo padre
      if(parent === arg.sourceParent) return;

      // Si el target es igual al contenedor inicial, se devuelve a su posición original
      // Compara el _id para encontrar la pareja idéntica. Si es igual, la respuesta es correcta
      if(parent.id === item.letter){
        // RESPUESTA CORRECTA
        rightAnswers += 1;
        self.rightAnswer(item);
      } else {
        // RESPUESTA INCORRECTA
        self.wrongAnswer(item);
        arg.cancelDrop = true;
      }

      // Reducimos en 1 las posibilidades
      chances -= 1;

      // La actividad termina cuando el número de posibilidades se termina
      if(chances === 0 || word.length === rightAnswers) {
        // Si el número de respuestas correctas es mayor o igual al requerido inicialmente
        if(rightAnswers >= minRightAnswers) {
          self.success(true); // Trigger de éxito
          $rootScope.isNextEnabled = true; // Activamos el siguiente
        } else {
          self.failure(true); // Trigger de fracaso
        }
      }
    };

  };

  /**
   * Inicializa la instancia del ViewModel creado con puzzleWordActivity.create
   *
   * @param {object} instance Intancia del VM de knockout
   */
  puzzleWordActivity.run = function (instance) {
    ko.cleanNode($('#main-container')[0]);
    ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
    ko.applyBindings(instance, $('#main-container')[0]);
  };

  return puzzleWordActivity;

});

lizPuzzleWord.directive('puzzleWord', function  (puzzleWordActivity) {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      description: '@',
      audio:'@',
      customClass: '@'
    },
    templateUrl: '../views/activities/puzzle_word.html',
    link: function postLink(scope, element, attrs) {
      // Añadimos el audio a options
      scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;

      // Corremos la aplicación
      puzzleWordActivity.run(puzzleWordActivity.create(scope.options));
    }
  };
});

var lizQuestionsImages = angular.module('lizQuestionsImages', ['factories']);

lizQuestionsImages.directive('questionsImages', function  (shuffleArrayFactory) {
    return {
        restrict: 'E',
        scope: {
            options: '=',
            audio: '@',
            description: '@'
        },
        templateUrl: '../views/activities/questions_images.html',
        link: function (scope, element, attrs) {

            var opt = scope.options,
                rightAnswers = 0;


            // variables básicas de la acividad de angular
            scope.rightAnswer = false;
            scope.wrongAnswer = false;
            scope.success = false;
            scope.failure = false;
            scope.$root.isNextEnabled = false;
            scope.imgwidth = (opt.imgwidth) ? opt.imgwidth : 60;
            scope.chancesPerItem = (opt.chancesPerItem) ? opt.chancesPerItem : 2;
            scope.minRightAnwers = opt.minRightAnwers;
            scope.randomItems = (scope.options.randomItems) ? true:false;

            // Imagen principal
            scope.src = opt.src;
            scope.alt = opt.alt;

            // Preguntas
            scope.questions = opt.questions;

            // añadimos el número de posibilidades
            scope.questions.forEach(function (q) {
                q.chances = scope.chancesPerItem;
                if (scope.randomItems === true) {
                    shuffleArrayFactory.run(q.answers);
                }
            });

            /**
             * Verifica la respuesta.
             */
            scope.verify = function (item, select) {

                console.log("item ");
                console.log(item);

                if ( item.completed) return ;

                if (select.answer)    {
                    console.log("bien");

                    scope.rightAnswer = Math.random();
                    item.wrong = false;
                    item.right = true;
                    rightAnswers += 1;
                    item.completed = true;
                }
                else {
                    item.wrong = true;
                    scope.wrongAnswer = Math.random();
                    item.chances -= 1;
                    if(item.chances === 0) {item.completed = true;console.log(item);item.feedback = item.answers.filter(function (a) {
                        return a.answer;
                    })[0].text}
                }

                /*

                if(item.selectedAnswer.answer) {
                    scope.rightAnswer = Math.random();
                    item.wrong = false;
                    item.right = true;
                    rightAnswers += 1;
                    item.completed = true;
                } else {
                    item.wrong = true;
                    scope.wrongAnswer = Math.random();
                    item.chances -= 1;
                    if(item.chances === 0) {item.completed = true;console.log(item);item.feedback = item.answers.filter(function (a) {
                        return a.answer;
                    })[0].text}
                }*/

                // Contamos los elementos terminados
                var completedItems = scope.questions.filter(function (q) {
                    return q.completed;
                }).length;

                if(completedItems === scope.questions.length) {
                    scope.$root.isNextEnabled = true;

                    scope.$root.beforeGoNext = function () {
                        // solo pasa la actividad si todas las respuestas son correctas
                        if(rightAnswers === scope.questions.length || rightAnswers >= scope.minRightAnwers) {
                            scope.success = true;
                            return true;
                        } else {
                            scope.failure = true;
                            return true;
                        }

                    };

                }

            };
        }
    };
});

var lizRadioQuestions = angular.module('lizRadioQuestions', ['factories']);

lizRadioQuestions.directive('radioQuestions', function  (shuffleArrayFactory,$sce) {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      audio: '@',
      description: '@'
    },
    templateUrl: '../views/activities/radio_questions.html',
    link: function (scope, element, attrs) {
      var opt = scope.options,
        rightAnswers = 0;

      // variables básicas de la acividad de angular
      scope.rightAnswer = false;
      scope.wrongAnswer = false;
      scope.success = false;
      scope.failure = false;
      scope.$root.isNextEnabled = false;
      scope.imgwidth = (opt.imgwidth) ? opt.imgwidth : 60;
      scope.chancesPerItem = (opt.chancesPerItem) ? opt.chancesPerItem : 2;
      scope.minRightAnwers = opt.minRightAnwers;
      scope.randomItems = (scope.options.randomItems) ? true:false;

      // Imagen principal
      scope.src = opt.src;
      scope.alt = opt.alt;
      scope.imgTitle = opt.imgTitle ? opt.imgTitle : false;
      scope.maintext = opt.maintext ? opt.maintext : false;

      // Preguntas
      scope.questions = opt.questions;

      // añadimos el número de posibilidades
      scope.questions.forEach(function (q) {
        q.chances = scope.chancesPerItem;
        if (scope.randomItems === true) {
          shuffleArrayFactory.run(q.answers);
        }
      });

      // Para usar el html en angular
      scope.sanitize = function (item) {
        return $sce.trustAsHtml(item);
      }

      /**
       * Verifica la respuesta.
       */
      scope.verify = function (item) {
        if(item.selectedAnswer.answer) {
          scope.rightAnswer = Math.random();
          item.wrong = false;
          item.right = true;
          rightAnswers += 1;
          item.completed = true;
        } else {
          item.wrong = true;
          scope.wrongAnswer = Math.random();
          item.chances -= 1;
          if(item.chances === 0) {item.completed = true;console.log(item);item.feedback = item.answers.filter(function (a) {
          return a.answer;
          })[0].text}
        }

        // Contamos los elementos terminados
        var completedItems = scope.questions.filter(function (q) {
          return q.completed;
        }).length;

        if(completedItems === scope.questions.length) {
          scope.$root.isNextEnabled = true;

          scope.$root.beforeGoNext = function () {
            // solo pasa la actividad si todas las respuestas son correctas
            if(rightAnswers === scope.questions.length || rightAnswers >= scope.minRightAnwers) {
              scope.success = true;
              return true;
            } else {
              scope.failure = true;
              return true;
            }
           
          };
          
        }

      };
    }
  };
});

var lizRadioQuestionsImages = angular.module('lizRadioQuestionsImages', ['factories']);

lizRadioQuestionsImages.directive('radioQuestionsImages', function  (shuffleArrayFactory) {
    return {
        restrict: 'E',
        scope: {
            options: '=',
            audio: '@',
            description: '@'
        },
        templateUrl: '../views/activities/radio_questions_images.html',
        link: function (scope, element, attrs) {

            console.log("hola");
            var opt = scope.options,
                rightAnswers = 0;


            // variables básicas de la acividad de angular
            scope.rightAnswer = false;
            scope.wrongAnswer = false;
            scope.success = false;
            scope.failure = false;
            scope.$root.isNextEnabled = false;
            scope.imgwidth = (opt.imgwidth) ? opt.imgwidth : 60;
            scope.chancesPerItem = (opt.chancesPerItem) ? opt.chancesPerItem : 2;
            scope.minRightAnwers = opt.minRightAnwers;
            scope.randomItems = (scope.options.randomItems) ? true:false;

            // Imagen principal
            scope.src = opt.src;
            scope.alt = opt.alt;

            // Preguntas
            scope.questions = opt.questions;

            // añadimos el número de posibilidades
            scope.questions.forEach(function (q) {
                q.chances = scope.chancesPerItem;
                if (scope.randomItems === true) {
                    shuffleArrayFactory.run(q.answers);
                }
            });

            /**
             * Verifica la respuesta.
             */
            scope.verify = function (item) {
                if(item.selectedAnswer.answer) {
                    scope.rightAnswer = Math.random();
                    item.wrong = false;
                    item.right = true;
                    rightAnswers += 1;
                    item.completed = true;
                } else {
                    item.wrong = true;
                    scope.wrongAnswer = Math.random();
                    item.chances -= 1;
                    if(item.chances === 0) {item.completed = true;console.log(item);item.feedback = item.answers.filter(function (a) {
                        return a.answer;
                    })[0].text}
                }

                // Contamos los elementos terminados
                var completedItems = scope.questions.filter(function (q) {
                    return q.completed;
                }).length;

                if(completedItems === scope.questions.length) {
                    scope.$root.isNextEnabled = true;

                    scope.$root.beforeGoNext = function () {
                        // solo pasa la actividad si todas las respuestas son correctas
                        if(rightAnswers === scope.questions.length || rightAnswers >= scope.minRightAnwers) {
                            scope.success = true;
                            return true;
                        } else {
                            scope.failure = true;
                            return true;
                        }

                    };

                }

            };
        }
    };
});

var lizReplaceWithInputs = angular.module('lizReplaceWithInputs', []);

lizReplaceWithInputs.directive('replaceWithInputs', function  ($compile) {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      audio: '@',
      description: '@'
    },
    templateUrl: '../views/activities/replace_with_inputs.html',
    link: function postLink(scope, element, attrs) {
      var opt = scope.options,
        rightAnswers = 0,
        minRightAnswers = opt.minRightAnswers,
        cnt = opt.content, // Content to process
        placeholders = [], // Array con los placeholders
        placeholderCounter = 0; // Contador para crear scope.answers

      // imagen - audio
      scope.src = opt.src;
      scope.alt = opt.alt;
      scope.addAudio = opt.audio;

      scope.title = opt.title;
      scope.answers = [];

      // Busca los placeholders
      cnt.replace(/\$\{(\d+)\}/g, function (a, b) {
        a = a.substr(2, a.length - 3); // Remueve los elementos que producen la interpolación
        placeholders.push(a);
      });

      // En base a los placeholders, creamos cada uno de los targets
      placeholders.forEach(function (p) {
        var a = {},
          _data = null,
          answer = opt.answers[p];

        a.input = ''; // modelo
        a.chances = 2; // oportunidades

        if(typeof answer === 'object') {
          _data = answer.data
        } else {
          _data = answer;
        }

        if(_data instanceof Array) {
          a.answer = _data;
        } else {
          a.answer = _data.toString();
        }

        a.customClass = answer.hasOwnProperty('customClass') ? answer.customClass : '';
        a.placeholder = answer.hasOwnProperty('placeholder') ? answer.placeholder : '';

        scope.answers.push(a); // Añade a las respuestas
      });

      // Reemplaza los placeholders con los elementos funcionales (inputs)
      cnt = cnt.replace(/\$\{(\d+)\}/g, function (a, b) {
        a = "answers[" + placeholderCounter + "]";
        placeholderCounter += 1;

        var elem = '<span class="input-container">\n    <input style="_s_" class="input-primary {{ _x_.customClass }}" type="text" ng-model="_x_.input" ng-disabled="_x_.completed" ng-blur="verify(_x_)" placeholder="{{ _x_.placeholder }}"/>\n    <span class="icon-right" ng-show="_x_.right"></span>\n    <span class="icon-wrong" ng-show="_x_.wrong"></span>\n</span>\n';

        elem = elem.replace(/_s_/g, opt.inputStyles);
        return elem.replace(/_x_/g, a);
      });

      // Compilación
      element.find('.operation-content').append($compile(cnt)(scope));

      /**
       * Verifica cada campo de texto. Si hay errores, lo limpia instantáneamente.
       * @param item
       */
      scope.verify = function (item) {
        // Si esta completo o si el input no tiene el tamaño de la respuesta, salimos
        if(item.completed || item.input.trim() === "") return false;

        var completedItems = null,
          condition = null;

        if(item.answer instanceof Array) {
          condition = item.answer.indexOf(item.input.trim()) >= 0;
        } else {
          condition = item.answer === item.input.trim();
        }

        if(condition) {
          // Respuesta correcta
          delete item.wrong;

          item.right = true;
          item.completed = true; // Marca el item como terminado
          rightAnswers += 1; // Incrementa las respuestas correctas
        } else {
          // Respuesta incorrecta
          item.wrong = true;
          item.chances -= 1;

          if(item.chances === 0) {
            item.completed = true;
          } else {
            item.input = ''; // Limpia el input
          }
        }

        // Contamos los elementos completos
        completedItems = scope.answers.filter(function (a) {
          return a.completed;
        }).length;

        // Fin de la actividad
        if(completedItems === scope.answers.length) {
          // Hacemos la realimentación, poniendo todas las respuestas correctas
          scope.answers.forEach(function (answer) {
            answer.input = answer.answer;
          });

          scope.$root.isNextEnabled = true;
        }

      };

      // Función especial que se ejecuta al dar click en la flecha de siguiente
      scope.$root.beforeGoNext = function () {
        if(rightAnswers >= minRightAnswers) {
          scope.success = true;
          return true;
        } else {
          scope.failure = true;
          return false;
        }
      };

    }
  };
});

var lizReplaceWithInputsMat = angular.module('lizReplaceWithInputsMat', []);

lizReplaceWithInputsMat.directive('replaceWithInputsMat', function  ($compile) {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      audio: '@',
      description: '@',
    },
    templateUrl: '../views/activities/replace_with_inputs_mat.html',
    link: function postLink(scope, element, attrs) {
      var opt = scope.options,
        rightAnswers = 0,
        minRightAnswers = opt.minRightAnswers,
        cnt = opt.content, // Content to process
        placeholders = [], // Array con los placeholders
        placeholderCounter = 0; // Contador para crear scope.answers

      // imagen - audio
      scope.src = opt.src;
      scope.alt = opt.alt;
      scope.addAudio = opt.audio;

      scope.title = opt.title;
      scope.answers = [];

      // Busca los placeholders
      cnt.replace(/\$\{(\d+)\}/g, function (a, b) {
        a = a.substr(2, a.length - 3); // Remueve los elementos que producen la interpolación
        placeholders.push(a);
      });
      // En base a los placeholders, creamos cada uno de los targets
      placeholders.forEach(function (p) {
        var a = {},
          _data = null,
          answer = opt.answers[p];

        a.input = ''; // modelo
        a.chances = 2; // oportunidades

        if(typeof answer === 'object') {
          _data = answer.data
        } else {
          _data = answer;
        }

        if(_data instanceof Array) {
          a.answer = _data;
        } else {
          a.answer = _data.toString();
        }

        a.customClass = answer.hasOwnProperty('customClass') ? answer.customClass : '';
        a.placeholder = answer.hasOwnProperty('placeholder') ? answer.placeholder : '';

        scope.answers.push(a); // Añade a las respuestas
      });

      // Reemplaza los placeholders con los elementos funcionales (inputs)
      cnt = cnt.replace(/\$\{(\d+)\}/g, function (a, b) {
        a = "answers[" + placeholderCounter + "]";
        placeholderCounter += 1;

        var elem = '<span class="input-container">\n    <input style="_s_" class="input-primary {{ _x_.customClass }}" type="text" ng-model="_x_.input" ng-disabled="_x_.completed" ng-blur="verify(_x_)" placeholder="{{ _x_.placeholder }}"/>\n    <span class="icon-right" ng-show="_x_.right"></span>\n    <span class="icon-wrong" ng-show="_x_.wrong"></span>\n</span>\n';

        elem = elem.replace(/_s_/g, opt.inputStyles);
        return elem.replace(/_x_/g, a);
      });
       cnt = cnt.replace(/\$\{(\d+)\}/g, function (a, b) {
        a = "answers[" + placeholderCounter + "]";
        placeholderCounter += 1;

        var elem = '<span class="input-container">\n    <input style="_s_" class="input-primary {{ _x_.customClass }}" type="text" ng-model="_x_.input" ng-disabled="_x_.completed" ng-blur="verify(_x_)" placeholder="{{ _x_.placeholder }}"/>\n    <span class="icon-right" ng-show="_x_.right"></span>\n    <span class="icon-wrong" ng-show="_x_.wrong"></span>\n</span>\n';

        elem = elem.replace(/_s_/g, opt.inputStyles);
        return elem.replace(/_x_/g, a);
      });

       


      // Compilación
      element.find('.operation-content').append($compile(cnt)(scope));
       

      /**
       * Verifica cada campo de texto. Si hay errores, lo limpia instantáneamente.
       * @param item
       */
      scope.verify = function (item) {
        // Si esta completo o si el input no tiene el tamaño de la respuesta, salimos
        if(item.completed || item.input.trim() === "") return false;

        var completedItems = null,
          condition = null;

        if(item.answer instanceof Array) {
          condition = item.answer.indexOf(item.input.trim()) >= 0;
        } else {
          condition = item.answer === item.input.trim();
        }

        if(condition) {
          // Respuesta correcta
          delete item.wrong;

          item.right = true;
          item.completed = true; // Marca el item como terminado
          rightAnswers += 1; // Incrementa las respuestas correctas
        } else {
          // Respuesta incorrecta
          item.wrong = true;
          item.chances -= 1;

          if(item.chances === 0) {
            item.completed = true;
          } else {
            item.input = ''; // Limpia el input
          }
        }

        // Contamos los elementos completos
        completedItems = scope.answers.filter(function (a) {
          return a.completed;
        }).length;

        // Fin de la actividad
        if(completedItems === scope.answers.length) {
          // Hacemos la realimentación, poniendo todas las respuestas correctas
          scope.answers.forEach(function (answer) {
            answer.input = answer.answer;
          });

          scope.$root.isNextEnabled = true;
        }

      };

      // Función especial que se ejecuta al dar click en la flecha de siguiente
      scope.$root.beforeGoNext = function () {
        if(rightAnswers >= minRightAnswers) {
          scope.success = true;
          return true;
        } else {
          scope.failure = true;
          return false;
        }
      };

    }
  };
});

/**
 * La actividad permite seleccionar varias opciones hubicadas en una o varias imagenes.
 */
var lizSelectAllCorrectImageOption = angular.module('lizSelectAllCorrectImageOption', []);

lizSelectAllCorrectImageOption.directive('selectAllCorrectImageOption', function () {
	return {
		restrict: 'E',
        templateUrl: '../views/activities/select_all_correct_image_option.html',
        scope: {
            options: '=',
            instruction: '@',
            title: '@',
            description: '@',
            audio: '@'
        },
		link: function ($scope, iElement, iAttrs) {

			$scope.items = $scope.options.items;

			$scope.rightAnswers = 0;
			$scope.complete = false; // Cuando termina la actividad
			$scope.block = false;
			$scope.success = false;
			$scope.failure = false;
			$scope.rightAnswer = false;
  			$scope.wrongAnswer = false;
  			$scope.classComplete = $scope.options.classComplete;
			$scope.itemsPerRow = $scope.options.itemsPerRow;
			$scope.minRightAnswers = $scope.options.minRightAnswers;


			angular.forEach($scope.items, function (value, key) {
				value.chances = $scope.options.chancesPerItem;
			});

			// watch if the activity is finished
			$scope.$watch('complete', function(complete) {
				if (complete) {
					if ($scope.rightAnswers >= $scope.minRightAnswers) {
						// éxito
						$scope.success = true;

						// Activamos la siguiente actividad o ruta
						$scope.$root.isNextEnabled = true;
					} else {
						// fracaso
						$scope.failure = true;
					}
				} 
			});
			// Si la descripción o el título están, entonces la instrucción va al fondo
			$scope.isBottom = $scope.title || $scope.description;

			var counter = 0;

			$scope.verify = function (item, opt) {
			if (opt.complete){return}

				if (true === opt.correct) {
					$scope.rightAnswers++;
					$scope.rightAnswer = Math.random();
					opt.complete = true; // marcamos el item como completo
					opt.right = true
					
				} else {
					// obj.wrong ? obj.chances=$scope.options.chancesPerItem-2: obj.chances=$scope.options.chancesPerItem-1;

                	item.wrong = true;
                	$scope.wrongAnswer = Math.random();
                	opt.complete = true; // marcamos el item como completo
                	opt.wrong = true

                    	
				}

				if(item.chances === 1 || $scope.rightAnswers === $scope.minRightAnswers){
                    	counter++;
                }else{item.chances--;}

				if(counter === $scope.items.length){
                    $scope.complete = true;
                }
			}

			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			$scope.getStyles = function (item) {
				var styles = "";

				if($scope.itemsPerRow){
					styles += "width: " + (100 / $scope.itemsPerRow) + "%;";
				} else {
					styles += "width: " + (100 / $scope.items.length) + "%;";
				}

				if(item.style){
					styles += item.style;
				}
				
				return styles;
			};

			/**
			 * Devuelve los estilos de cada elemento
			 */
			$scope.getOptionStyles = function (opt) {
				var styles = '';

				styles += "width: " + opt.w + "px;";
				styles += "height: " + opt.h + "px;";
				styles += "top: " + opt.t + "%;";
				styles += "left: " + opt.l + "%;";
				
				return styles;
			};
		}
	};
});
var lizSelectCheckbox = angular.module('lizSelectCheckbox', []);

lizSelectCheckbox.directive('selectCheckbox', function ($sce) {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      audio: '@',
      title: '@',
      description: '@'
    },
    templateUrl: '../views/activities/select_checkbox.html',
    link: function (scope, element, attrs) {
      var opt = scope.options,
        rightAnswers = 0,
        chances = opt.chances,
        minRightAnswers = opt.minRightAnswers;

      scope.rightAnswers = false;
      scope.wrongAnswer = false;
      scope.success = false;
      scope.failure = false;

      scope.showFeedback = false; // Realimentación

      scope.questions = opt.questions;
      scope.answerwidth = opt.answerwidth;

      //configuramos las opciones para cada pregunta
      scope.questions.forEach(function (q) {

        q.maxRightAnswers = q.items.filter(function (i) {
          return i.answer;
        }).length;//numero de respustas buenas
        q.chances = opt.chancesperitem // posibilidades por pregunta
         q.showFeedback = false; // Realimentación
         q.feedback = "Las respuestas correctas son:";
         
      });


      scope.$root.beforeGoNext = function () {
        if (rightAnswers >= minRightAnswers) {
          scope.success = true;
          return true;
        } else {
          scope.failure = true;
          return true;
        }
      };

      // Permite el uso de html
      scope.sanitize = function (item) {
        return $sce.trustAsHtml(item);
      };

      /**
       * Verifica el elemento.
       * @param item
       */
      scope.verify = function (item,q) {
        if(item.answer === item.selectedAnswer) {
          scope.rightAnswer = Math.random();
          rightAnswers += 1;
          q.maxRightAnswers -= 1;
        } else {
          scope.wrongAnswer = Math.random();
        }

        item.completed = true;
        q.chances -= 1;

        if (q.chances === 0 || q.maxRightAnswers === 0) {
          q.items.forEach(function (i,index) {
            if(i.answer){
              var coma = index > 1 ? ',' : ''
              q.feedback += coma + " " + '<strong>'+i.text+'<strong>'
            }
          }); 
          q.disableAll = true;
          q.showFeedback = true;
          chances -= 1;
        }

        if (chances === 0) {
          scope.$root.isNextEnabled = true;
        }

      };

    }
  };
});

/**
 * La actividad permite seleccionar varias opciones hubicadas en una o varias imagenes.
 */
var lizSelectCorrectImageOption = angular.module('lizSelectCorrectImageOption', []);

lizSelectCorrectImageOption.directive('selectCorrectImageOption', function () {
	return {
		restrict: 'E',
        templateUrl: '../views/activities/select_correct_image_option.html',
        scope: {
            options: '=',
            instruction: '@',
            title: '@',
            description: '@',
            audio: '@'
        },
		link: function ($scope, iElement, iAttrs) {

			$scope.items = $scope.options.items;

			$scope.rightAnswers = 0;
			$scope.complete = false; // Cuando termina la actividad
			$scope.block = false;
			$scope.success = false;
			$scope.failure = false;
			$scope.itemsPerRow = $scope.options.itemsPerRow;
			$scope.minRightAnswers = $scope.options.minRightAnswers;

			angular.forEach($scope.items, function (value, key) {
				value.chances = $scope.options.chancesPerItem-1;
			});

			// watch if the activity is finished
			$scope.$watch('complete', function(complete) {
				if (complete) {
					if ($scope.rightAnswers >= $scope.minRightAnswers) {
						// éxito
						$scope.success = true;

						// Activamos la siguiente actividad o ruta
						$scope.$root.isNextEnabled = true;
					} else {
						// fracaso
						$scope.failure = true;
					}
				} 
			});

			// Si la descripción o el título están, entonces la instrucción va al fondo
			$scope.isBottom = $scope.title || $scope.description;

			var counter = 0;

			$scope.verify = function (item, opt) {

				if (true === opt.correct) {
					$scope.rightAnswers++;
					item.wrong = false;
					item.right = true;
					item.block = true; // marcamos el item como completo
					counter++;
				} else {
					// obj.wrong ? obj.chances=$scope.options.chancesPerItem-2: obj.chances=$scope.options.chancesPerItem-1;

                	item.wrong = true;
                	

                    	if(item.chances === 0){
                    	item.block = true;
                    	counter++;
                    	}else{chances--;}
				}

				if(counter === $scope.items.length){
                    $scope.complete = true;
                }
			}

			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			$scope.getStyles = function (item) {
				var styles = "";

				if($scope.itemsPerRow){
					styles += "width: " + (100 / $scope.itemsPerRow) + "%;";
				} else {
					styles += "width: " + (100 / $scope.items.length) + "%;";
				}

				if(item.style){
					styles += item.style;
				}
				
				return styles;
			};

			/**
			 * Devuelve los estilos de cada elemento
			 */
			$scope.getOptionStyles = function (opt) {
				var styles = '';

				styles += "width: " + opt.w + "px;";
				styles += "height: " + opt.h + "px;";
				styles += "top: " + opt.t + "%;";
				styles += "left: " + opt.l + "%;";
				
				return styles;
			};
		}
	};
});
/**
 * La actividad permite completar palabras en inputs
 */
var lizSelectOptionsImg = angular.module('lizSelectOptionsImg', ['factories']);

lizSelectOptionsImg.directive('selectOptionsImg', function(shuffleArrayFactory){
	return {
		restrict: 'E',
		templateUrl: '../views/activities/select_options_img.html',
		scope: {
			options: "=",
			title: '@',
			correctAnswer: '@',
			description: '@',
			instruction: '@',
			audio:'@'
		},
		link: function(scope, element, attrs){
			var opt = scope.options, // alias
        random = opt.hasOwnProperty('random') ? opt.random : true,
				minRightAnswers = opt.minRightAnswers,
				rightAnswers = 0; // contador de respuestas correctas

			// Inputs procesados
			scope.words = [];
			scope.extension = opt.extension ? opt.extension : '.png';

			// Procesamos cada elemento del array entrante
			angular.forEach(scope.inputs, function (input) {
				scope.words.push({ word: input, right: false, wrong: false });
			});

			scope.chancesPerItem = opt.chancesPerItem;
			scope.hideDescription = opt.hideDescription;
			scope.itemsPerRow = opt.itemsPerRow;
			scope.items = opt.items;
			scope.block = false;

			scope.success = false;
			scope.failure = false;

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;


			// Añadimos las variables necesarias para la funcionalidad
			scope.items.forEach(function(item){

        if(random) shuffleArrayFactory.run(item.options); // Barajamos las opciones

				item.options.unshift({
					text: 'Elige una repuesta',
					firstElement: true
				});

				item.selected = item.options[0];

				item.chances = scope.chancesPerItem; // ponemos el número de oportunidades de cada pregunta
			});


			/**
			 * Verifica cada una de las respuestas
			 */
			scope.verify = function (item) {
				// Si es el primer elemento, ocultamos los íconos de respuesta
				if(item.selected.firstElement) {
					delete item.right;
					delete item.wrong;

					return;
				}

				if(item.selected.answer) {
					// respuesta correcta
					delete item.wrong;

					item.right = true;
					item.disabled = true;
					rightAnswers += 1;
				} else {
					// respuesta incorrecta
					item.wrong = true;
					item.chances -= 1;
					if (item.chances === 0) item.disabled = true;
				}

				// Hay que mirar que la actividad haya sido completada
				var completedItems = scope.items.filter(function(item){
					return item.disabled;
				}).length;

				if(completedItems === scope.items.length) {
					if(rightAnswers >= minRightAnswers) {
						// éxito
						scope.$root.isNextEnabled = true;
						scope.success = true;
					} else {
						scope.failure = true;
					}
				}
			};


			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function () {
				var styles = "";

				if(scope.itemsPerRow){
					styles += "width: " + (100 / scope.itemsPerRow) + "%;";
				} else {
					styles += "width: " + (100 / (scope.options.data.length + 2)) + "%;";
					styles += "margin-left: " + (100 / (scope.options.data.length * 4)) + "%;";
				}
				
				return styles;
			}

		}
	};
});


var lizSelectOptionsPositions = angular.module('lizSelectOptionsPositions', ['factories']);

lizSelectOptionsPositions.directive('selectOptionsPositions', function  (shuffleArrayFactory) {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/select_options_positions.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@'
			
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.canvas = scope.options.canvas; // La imagen principal
			scope.canvasStyle = scope.options.canvasStyle; // La imagen principal
			scope.titlecanvas = scope.options.titlecanvas; // title de La imagen principal
			minRightAnswers = scope.options.minRightAnswers
			scope.selectindividual = scope.options.selectindividual //separa cada respuesta en un recuadro individual
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			completedItems = 0;

			/**
			 * Definimos nuestra función beforeGoNext para que muestre el cuadro de felicitaciones
			 */
			scope.$root.beforeGoNext = function () {
				console.log(rightAnswers);
				if(rightAnswers >= minRightAnswers){
					scope.success = true;
					return true; 
				}else{scope.failure = true;}

				return true; 
			};


			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getTargetsStyles = function (item) {
				var styles = '';

				styles += 'width: ' + item.w + 'px;';
				styles += 'height: ' + item.h + 'px;';
				styles += 'top: ' + item.t + '%;';
				styles += 'left: ' + item.l + '%;';

				/*// estilos personalizados
				if(opt.hasOwnProperty('customStyles')) styles += opt.customStyles;*/

				return styles;
			};
			/**
			 * Para obtener los estilos las calificaciones de los targets 
			 */
			scope.getTargetsStyles2 = function (item) {
				var styles = '';

				styles += 'width: ' + item.w + 'px;';
				styles += 'height: ' + item.h + 'px;';
				styles += 'top: ' + item.t + '%;';
				styles += 'left: ' + item.l + '%;';
				styles += 'background-size: ' + item.w + 'px;' + item.w + 'px;';
				/*// estilos personalizados
				if(opt.hasOwnProperty('customStyles')) styles += opt.customStyles;*/

				return styles;
			};

		

      // añadimos algunas opciones
      scope.items.forEach(function (q) {
        q.chances = scope.options.chances; // posibilidades por pregunta

        if(scope.options.optionsrandom){
        shuffleArrayFactory.run(q.options); // baraja
    	}
    	if(!scope.selectindividual){
	        q.options.unshift({
	          text: "Elige una respuesta",
	          default: true
	        });
        }

        q.selectedAnswer = q.options[0]; // elige la primera, en este caso, "elige una respuesta"

        q.rightAnswer = q.options.filter(function (answer) {
          return answer.answer;
        })[0];
      });

			/**
			 * Marca los elementos y verifica el final
			 */
			scope.verify = function (item) {
								
				 if(item.selectedAnswer.default) return; // Es "Elige una respuesta"
				
				if(item.selectedAnswer.answer) {
		          /*scope.rightAnswer = Math.random();*/
		          if(item.freeanswer){
			          	if(item.chances === scope.options.chances){
			          		item.wrong = false;
							item.right = true;
			          		rightAnswers += 1;
			          		item.chances -= 1;
			          	}else{item.chances -= 1;}

				          	if(item.chances === 0){
				          		 item.completed = true;
				          	}
			        }else{
			        	item.wrong = false;
						item.right = true;
				        rightAnswers += 1;
				        item.completed = true;
		     		}

	       		} else {
		          scope.wrongAnswer = Math.random();
		          item.chances -= 1;
		          item.wrong = true;
		          	if(item.chances === 0){
				        item.completed = true;
				        item.right = false;
						item.wrong = true;				        
					}
	        	}

				var countCompleted = scope.items.filter(function(item){
					return item.completed;
				}).length;
		
				if(countCompleted === scope.items.length || rightAnswers === scope.items.length ) {
					scope.$root.isNextEnabled = true; // Activa la flecha de siguiente
				}
			};

			/**
			 * Marca los elementos y verifica el final
			 */
			scope.verify2 = function (a,item) {

				if(item.completed) return; // Es "Elige una respuesta"
				console.log(item);	

				if(a.answer) {
		          
			        	item.wrong = false;
						item.right = true;
				        rightAnswers += 1;
				        item.completed = true;
				        a.istrue = true

	       		} else {
		          scope.wrongAnswer = Math.random();
		          item.chances -= 1;
		          item.wrong = true;
		          	if(item.chances === 0){
				        item.completed = true;
				        item.right = false;
						item.wrong = true;	
						 a.isfalse = true			        
					}
	        	}

				var countCompleted = scope.items.filter(function(item){
					return item.completed;
				}).length;
		
				if(countCompleted === scope.items.length || rightAnswers === scope.items.length ) {
					scope.$root.isNextEnabled = true; // Activa la flecha de siguiente
				}
			};

		}

    }; 
});





var lizSelectOptionsTable = angular.module('lizSelectOptionsTable', []);

lizSelectOptionsTable.directive('selectOptionsTable', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/activities/select_options_table.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			title:'@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.rowsstyle = scope.options.rowsstyle;
			scope.mainimg = scope.options.mainimg;
			scope.minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			scope.chancesPerItem = (scope.options.chancesPerItem)
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			
			scope.questions = [];

			// añadimos el número de posibilidades
		    scope.items.forEach(function (q) {
		      q.list.forEach(function (i) {
			       if(i.hasOwnProperty('answers')) {

			       		scope.questions.push({
							item: i.answers,								      
					  	});

			       	if(i.default){
			       		i.answers.completed = true
			       		i.answers.right = true
			       		rightAnswers += 1
			       		i.answers.forEach(function (a) {

			       			if (a.answer) {

			       				i.answers.selectedAnswer = a
			       			};

		       			});
			       	}
			       	i.answers.chances = scope.chancesPerItem;
			       }
		       });
		    });

			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow){
					styles += "width: " + (100 / scope.itemsPerRow) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-right: " + (10 / scope.itemsPerRow) + "%!important;";
				} else {
					styles += "width: " + (100 / scope.items.length) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
				}
				
				return styles;

				
			};

			/**
	       * Verifica la respuesta.
	       */
		    scope.verify = function (item,a) {
		        if(item.selectedAnswer.answer) {
		          rightAnswers += 1;
		          item.right = true;
		          item.wrong = false;
		          item.completed = true;
		        } else {
		          item.chances -= 1;
		          item.right = false;
		          item.wrong = true;
		          if(item.chances === 0){ item.completed = true };
		        }

		        // Contamos los elementos terminados
		        var completedItems = scope.questions.filter(function (q) {
		          return q.item.completed;
		        }).length;

		        if(completedItems === scope.questions.length) {
		          // solo pasa la actividad si todas las respuestas son correctas
		          console.log(rightAnswers,scope.minRightAnswers);
		          if(rightAnswers === scope.questions.length || rightAnswers >= scope.minRightAnswers) {
		            scope.$root.isNextEnabled = true;
		            scope.success = true;
		          } else {
		            scope.failure = true;
		          }
		        }
		    };


		}


    }; 
});


var lizSelectQuestions = angular.module('lizSelectQuestions', ['factories']);

lizSelectQuestions.directive('selectQuestions', function  (shuffleArrayFactory,$sce) {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      audio: '@',
      description: '@',
      titletop: '@'
    },
    templateUrl: '../views/activities/select_questions.html',
    link: function (scope, element, attrs) {
      var opt = scope.options,
        rightAnswers = 0,
        minRightAnswers = opt.minRightAnswers,
        random = opt.hasOwnProperty('random') ? opt.random : true; // Verdadero por defecto

      // variables básicas de la acividad de angular
      scope.rightAnswer = false;
      scope.wrongAnswer = false;
      scope.success = false;
      scope.failure = false;

      // Imagen principal
      scope.src = opt.hasOwnProperty('src') ? opt.src : false;
      scope.text = opt.hasOwnProperty('text') ? opt.text : false;
      scope.bigImg = opt.hasOwnProperty('bigImg') ? opt.bigImg : false;
      scope.alt = opt.alt;
      scope.title = opt.title;
      scope.stylequestions = opt.stylequestions;

      // Preguntas
      scope.questions = opt.questions;

      // añadimos algunas opciones
      scope.questions.forEach(function (q) {
        q.chances = 2; // posibilidades por pregunta

        if(random) shuffleArrayFactory.run(q.answers); // baraja

        q.answers.unshift({
          text: "Elige una respuesta",
          default: true
        });

        q.selectedAnswer = q.answers[0]; // elige la primera, en este caso, "elige una respuesta"

        q.rightAnswer = q.answers.filter(function (answer) {
          return answer.answer;
        })[0];

      });

      /**
       * Cuando se da click en la flecha de siguiente
       */
      scope.$root.beforeGoNext = function () {
        if(rightAnswers >= minRightAnswers) {
          scope.success = true;
          return true;
        }

        scope.failure = true;
        return true;
      };

      // Para usar el html en angular
      scope.sanitize = function (item) {
        return $sce.trustAsHtml(item);
      }
      
      /**
       * abre el zoom 
       */
      scope.zoom = function () {
        if(scope.bigImg){
          scope.showBig = true;
        }
      };

      /**
       * Cierra el zoom 
       */
      scope.complete = function () {
        
          scope.showBig = false;
      };

      /**
       * Verifica la respuesta.
       */
      scope.verify = function (item) {
        if(item.selectedAnswer.default) return; // Es "Elige una respuesta"

        if(item.selectedAnswer.answer) {
          scope.rightAnswer = Math.random();
          rightAnswers += 1;
          item.completed = true;
        } else {
          scope.wrongAnswer = Math.random();
          item.chances -= 1;
          if(item.chances === 0){ item.completed = true;item.feedback = true;console.log(item);}
        }

        // Contamos los elementos terminados
        var completedItems = scope.questions.filter(function (q) {
          return q.completed;
        }).length;

        if(completedItems === scope.questions.length) {
          scope.$root.isNextEnabled = true;
          scope.feedback = true; // muestra la realimentación
        }
      };
    }
  };
});

/**
 * La actividad permite seleccionar varias opciones hubicadas en imagenes
 * de acuerdo a una imagen principal.
 */
var lizSelectTableImageMultiple = angular.module('lizSelectTableImageMultiple', []);

lizSelectTableImageMultiple.directive('selectTableImageMultiple', function () {
	return {
		restrict: 'E',
        templateUrl: '../views/activities/select_table_image_multiple.html',
        scope: {
            options: '=',
            instruction: '@',
            title: '@',
            description: '@',
            audio: '@'
        },
		link: function ($scope, iElement, iAttrs) {

			$scope.items = $scope.options.items;

			$scope.mainImageTitle = $scope.options.mainImageTitle;
			$scope.imageTitle2 = $scope.options.imageTitle2;
			$scope.imageTitle3 = $scope.options.imageTitle3;
			$scope.itemsLength = 0;
			$scope.rightAnswers = 0;
			$scope.complete = false; // Cuando termina la actividad
			$scope.block = false;
			$scope.success = false;
			$scope.failure = false;
			$scope.minRightAnswers = $scope.options.minRightAnswers;

			angular.forEach($scope.items, function (value, key) {
				$scope.itemsLength += value.cols.length;

				angular.forEach(value.cols, function (v, k) {
					v.chances = $scope.options.chancesPerItem-1;
				})
			})

			// watch if the activity is finished
			$scope.$watch('complete', function(complete) {
				if (complete) {
					if ($scope.rightAnswers >= $scope.minRightAnswers) {
						// éxito
						$scope.success = true;

						// Activamos la siguiente actividad o ruta
						$scope.$root.isNextEnabled = true;
					} else {
						// fracaso
						$scope.failure = true;
					}
				} 
			});

			// Si la descripción o el título están, entonces la instrucción va al fondo
			$scope.isBottom = $scope.title || $scope.description;

			var counter = 0,
				chances = $scope.options.chancesPerItem-1;

			$scope.verify = function (obj, item) {

				if (true === item.correct) {
					$scope.rightAnswers++;
					obj.wrong = false;
					obj.right = true;
					obj.disabled = true; // marcamos el item como completo
					counter++;
				} else {
					// obj.wrong ? obj.chances=$scope.options.chancesPerItem-2: obj.chances=$scope.options.chancesPerItem-1;

                	obj.wrong = true;
                	

                    	if(obj.chances === 0){
                    	obj.disabled = true;
                    	counter++;
                    	}else{chances--;}
				}

				console.log(obj);

				if(counter === $scope.itemsLength){
                    $scope.complete = true;
                }
			};

			/**
			 * Devuelve los estilos de cada elemento
			 */
			$scope.getStyles = function (opt) {
				var styles = '';

				styles += "-webkit-border-radius: " + opt.bdrs + ";"
				styles += "-moz-border-radius: " + opt.bdrs + ";"
				styles += "border-radius: " + opt.bdrs + ";"
				styles += "width: " + opt.w + "px;";
				styles += "height: " + opt.h + "px;";
				styles += "top: " + opt.t + "%;";
				styles += "left: " + opt.l + "%;";
				
				return styles;
			};
		}
	};
});
var lizSelectWords = angular.module('lizSelectWords', ['factories']);

lizSelectWords.directive('selectWords', function  (shuffleArrayFactory) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			description: '@',
			audio: '@',
			img: '@',
			alt: '@'
		},
		templateUrl: '../views/activities/select_words.html',
		link: function postLink(scope, element, attrs) {

			var opt = scope.options,
				text = opt.text.split(" "), // texto inicial
				changeWords = opt.words.slice(0), // Palabras a reemplazar
				rightAnswers = 0, // Contador de respuestas correctas
				minRightAnswers = opt.minRightAnswers, // Número mínimo de respuestas correctas
				chances = opt.chances; // posibilidades de realizar la actividad

			scope.words = []; // Palabras que se usarán al final
			scope.wordsOptions = []; // Opciones a usar en cada uno de los desplegables

			// variables de calificación
			scope.rightAnswer = false;
			scope.wrongAnswer = false;
			scope.success = false;
			scope.failure = false;

			// ============================================================================
			// Constructor de wordsOptions
			// ============================================================================
			// Añadimos la opción por defecto
			scope.wordsOptions.push({
				id: 0,
				text: "Elige una respuesta"
			});

			// Cargamos las demás opciones
			for(var i=0; i < changeWords.length; i++){
				scope.wordsOptions.push({
					id: i,
					text: changeWords[i]
				});
			}

			// ============================================================================
			// Constructor de scope.words
			// ============================================================================
			for(var i=0; i < text.length; i++){
				// Encuentra la expresión ${x}, donde x es el índice dentro del array de palabras
				if( text[i].match(/(^\$\{)\d(\}$)/) ){
					// Input
					// Recuperamos el índice del patrón
					var index = text[i].replace(/\D/g,'');

					scope.words.push({
						isInput: true,
						input: scope.wordsOptions[0],  // Se pone como valor inicial la respuesta
						word: changeWords[index] // Palabra a comparar
					});
				} else {
					// Palabra normal
					scope.words.push({
						isInput: false,
						word: text[i] + " "
					});
				}
			}

			// ============================================================================
			// Función de verificación
			// ============================================================================
			scope.verify = function (item) {

				if(item.word === item.input.text){
					// Respuesta Correcta
					scope.rightAnswer = Math.random(); // Disparador de respuesta
					item.completed = true;
					rightAnswers++;
				} else {
					// Respuesta Incorrecta
					scope.wrongAnswer = Math.random(); // Disparador de respuesta
				}

				chances--;

				// Si se acaban las oportunidades o 
				if(chances === 0 || changeWords.length === rightAnswers){
					if(rightAnswers >= minRightAnswers){
						// Éxito
						scope.$root.isNextEnabled = true;
						scope.success = true;
					} else {
						// Fracaso
						scope.failure = true;
					}
				}

			};
			
		}
	}; 
});

var lizSequences = angular.module('lizSequences', []);

// Knockout Pairs Factory
lizSequences.factory('sequencesActivity', function ($rootScope, shuffleArrayFactory) {

	var sequencesActivity = {};

	/**
	 * Crea el ViewModel
	 */
	sequencesActivity.create = function (options) {
		return new sequencesActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		options						Opciones a utilizar.
	 *
	 *
	 * @param {integer}		options.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		options.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {function}	options.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	options.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 *
	 */
	sequencesActivity._ViewModel = function (options) {
		var self = this;

		// Clase para sortables en la secuencia
		self.sequenceSortable = function (id) {
			this._sortable = ko.observableArray([]);
			this._sortable._id = id;
		};

		// Inicializa las opciones
		var chances = options.hasOwnProperty('chances') ? options.chances : options.spaces,
		 minRightAnswers = options.hasOwnProperty('minRightAnswers') ? options.minRightAnswers : options.spaces,
		 sequence = options.sequence,
		 tempId = 0, // id temporal que se añade a la secuencia
		 tempSequenceSortable = {}, // Variable Auxiliar
		 spaces = options.spaces; // Espacios en blanco


		// Antes que nada, debemos generar los id de los items
		options.items.forEach(function(item, index){
			item._id = index;
		});

		self.draggables = ko.observableArray( shuffleArrayFactory.run(options.items.slice(0)) ); // Elementos usados para el arrastre
		self.sequence = ko.observableArray([]);

		// Configuramos la secuencia
		for(var i=0; i < self.draggables().length + spaces; i++){
			// Alargamos la secuencia, usando tempId
			tempId = sequence[i - (sequence.length * Math.floor(i / sequence.length))];

			// Creamos el objeto
			tempSequenceSortable = new self.sequenceSortable(tempId);

			// Añadimos la muestra
			if(sequence.length > i){
				tempSequenceSortable._sortable.push( options.items[i] );
			}
			
			self.sequence.push(tempSequenceSortable); // añadimos a la secuencia
		}

		// Carpeta de recursos desde angular
		self.resources = $rootScope.resources;

		self.maximumElements = 1; // IMPORTANTE: Requerido para que los sortables no acepten más de un elemento
		self.rightAnswers = 0; // Inicializamos el número de respuestas buenas a 0

		// Triggers que se activan cuando la respuesta es correcta/incorrecta
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
		self.failure = ko.observable(false);
		self.success = ko.observable(false);


		/**
		 * Define si el target esta lleno utilizando self.maximumElements
		 */
		self.isContainerFull = function (parent) {
			return parent().length < self.maximumElements;
		};

		/**
		 * Estilos de los items de secuencia
		 */
		self.getItemStyles = function () {
			return "width: " + (100 / self.sequence().length) + "%;";
		};

		/**
		 * Función que se ejecuta cuando se suelta el elemento y hace toda la funcionalidad
		 */
		self.verifyAnswer = function (arg) {

			var parent = arg.targetParent,
				item = arg.item;

			if(parent._id === item._id){
				// RESPUESTA CORRECTA
				self.rightAnswers++;
				self.rightAnswer(item);

				spaces--; // Reducimos los espacios para poder definir el fin de la actividad

				// Si se definió una función cuando la respuesta es correcta, se corre
				if(typeof options.rightAnswerCallback !== "undefined" ) options.rightAnswerCallback(item);

			} else {
				// RESPUESTA INCORRECTA
				self.wrongAnswer(item);
				arg.cancelDrop = true;
			}

			// Reducimos en 1 las posibilidades
			chances--;

			// La actividad termina cuando el número de posibilidades se termina
			if(chances === 0 || spaces === 0) {

				// Si el número de respuestas correctas es mayor o igual al requerido inicialmente
				if(self.rightAnswers >= minRightAnswers) {
					self.success(true); // Trigger de éxito
					$rootScope.isNextEnabled = true; // Activamos el siguiente

					// Se llama la función de éxito, definida por el desarrollador
					if (typeof options.successCallback !== "undefined") options.successCallback();
				} else {
					self.failure(true); // Trigger de fracaso
				}

			}

		};
	};

	/**
	 * Inicializa la instancia del ViewModel creado con sequencesActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	sequencesActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return sequencesActivity;

});


lizSequences.directive('sequences', function  (sequencesActivity) {
	return {
		restrict: 'E',
		transclude: true,
		scope: {
			options: '=',
			description: '@'
		},
		templateUrl: '../views/activities/sequences.html',
		link: function postLink(scope, element, attrs) {

			// Corremos la aplicación
			var vm = sequencesActivity.create(scope.options);
			sequencesActivity.run(vm);
		}
	}; 
});

var lizSideNumbers = angular.module('lizSideNumbers', []);

lizSideNumbers.directive('sideNumbers', function  () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			description: '@',
			audio: '@'
		},
		templateUrl: '../views/activities/side_numbers.html',
		link: function (scope, element, attrs) {

			var opt = scope.options,
				totalNumbers = opt.numbers.length,
				rightAnswers = 0, // Contador de preguntas buenas
				chances = totalNumbers * 2, // el doble, ya que es izquierda y derecha
				minRightAnswers = opt.minRightAnswers;

			scope.numbers = []; // Listado de números

			scope.success = false;
			scope.failure = false;
			scope.example = opt.example;

			// Constructor de numbers
			opt.numbers.forEach(function(num){
				// Anadimos un objeto con prev y next. Cada uno tiene una variable para el modelo y el número a comparar
				if (opt.allowAll) {
					var prev = '';
					var next = '';

					for(i=0; i <= num.length-1; i = i+1){
					if(i === num.length-1){prev = prev + (parseInt(num.charAt(i)) - 1).toString()}else{prev = prev + num.charAt(i)};
					if(i === num.length-1){next = next + (parseInt(num.charAt(i)) + 1).toString()}else{next = next + num.charAt(i)};  
				};

					scope.numbers.push({
						prev: {
							input: '',
							number: (prev).toString()
						},
						central: num,
						next: {
							input: '',
							number: (next).toString()
						}
					});
				}else{
					scope.numbers.push({
						prev: {
							input: '',
							number: (parseInt(num) - 1).toString()
						},
						central: num,
						next: {
							input: '',
							number: (parseInt(num) + 1).toString()
						}
					});
				};

				//si se nesecita q el primer item sea el ejemplo 
				var index = 0
				if(index === 0 && scope.example === true){

					rightAnswers++;
					scope.numbers[index].prev.right = true;
					scope.numbers[index].next.right = true;
					scope.numbers[index].prev.input = scope.numbers[index].prev.number;
					scope.numbers[index].next.input = scope.numbers[index].next.number;
					scope.numbers[index].prev.completed = true; // marcamos el item como completo, para desactivar el input
					scope.numbers[index].next.completed = true; // marcamos el item como completo, para desactivar el input
					chances -= 1;
					rightAnswers++;
					index ++;


				};

			});

			/**
			 * Verifica si el input cumple con las condiciones del número 
			 */
			scope.verify = function (item) {
				if(item.input === '') return;

				// Si no es un número, borramos el último caractér
				if(!opt.allowAll) {
					if(!item.input.match(/^\d+$/)){
						item.input = item.input.slice(0, -1);
						return;
					}		
				}

				// Si se ha llenado el input con los dígitos necesarios
				if(item.input.length === item.number.length){

					// Verificamos la respuesta. Añadimos una propiedad right o wrong para definir si el item es correcto o no
					if(item.input === item.number){
						rightAnswers++;
						item.right = true; 
					} else {
						item.wrong = true;
					}

					item.completed = true; // marcamos el item como completo, para desactivar el input
					chances -= 1;

					// fin de la actividad
					if(chances === 0){
						if(rightAnswers >= minRightAnswers){
							scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
					} 
					
				} // if
			}; // verify()

		}
	}; 
});

var lizSoundGroup = angular.module('lizSoundGroup', []);

lizSoundGroup.factory('soundGroupActivity', function ($rootScope) {

	var soundGroupActivity = {};

	/**
	 * Crea el ViewModel
	 */
	soundGroupActivity.create = function (options) {
		return new soundGroupActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		options						Opciones a utilizar.
	 *
	 * @param {integer}		options.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		options.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {function}	options.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	options.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 *
	 */
	soundGroupActivity._ViewModel = function (options) {
		var self = this;

	// Sonido de grupo
	self.sound = ko.observable(options.sound);

	// Variables para sortables
	self.items = ko.observableArray(options.items);

	ko.utils.arrayForEach(self.items(), function (item) {
		if(! item.hasOwnProperty('answer')) item.answer = true;
		if(! item.hasOwnProperty('startsInGroup')) item.startsInGroup = false;
	});

	self.group = ko.observableArray(self.items.remove(function(item){
		return item.startsInGroup;
	}));

	// Ruta a la carpeta de imágenes
	self.resources = $rootScope.resources;

	// Disparador de preguntas correctas/incorrectas
	self.rightAnswer = ko.observable();
	self.wrongAnswer = ko.observable();

	self.success = ko.observable(false);
	self.failure = ko.observable(false);

	self.rightAnswers = 0;

	self.chances = options.chances ? options.chances : options.items.length;

	/**
	 * reproducir sonido
	 */
	self.playSound = function () {
		$('#audio-group')[0].play();
	};


	/**
	 * Obtiene los estilos de cada elemento
	 */
	self.getStyles = function (item) {
		var styles = '';

		if(! item.answer) return;

		styles += 'width: ' + item.w + '%;';
		styles += 'height: ' + item.h + '%;';
		styles += 'top: ' + item.t + '%;';
		styles += 'left: ' + item.l + '%;';

		return styles;
	}

/**
 *	Función que se ejecuta al soltar el objeto dentro del contenedor
 */
self.verifyAnswer = function (arg) {

	// No hacer nada y salir de la función, si el elemento se soltó en el mismo grupo inicial
	if(arg.sourceParent() == arg.targetParent()) return;

	// Calculamos si la respuesta es correcta o no usando la propiedad 'answer'
	if (arg.item.answer) {
		// Respuesta correcta
		self.rightAnswer(arg.item);
		self.rightAnswers++;

		// Llama a la función de respuesta buena
		if (typeof options.rightAnswerCallback !== "undefined") options.rightAnswerCallback();

	} else {
		// Respuesta Incorrecta
		self.wrongAnswer(arg.item);
		arg.cancelDrop = true; // Devuelve el elemento a su posición origina
	}

	// Reducimos las posibilidades
	self.chances--;

	// Fin de la actividad
	if (self.chances === 0) {
		if(self.rightAnswers >= options.minRightAnswers) {
			// éxito
			self.success(true);

			// Llama a la función de éxito
			if (typeof options.successCallback !== "undefined") options.successCallback();

			// Activamos la siguiente ruta
			$rootScope.isNextEnabled = true;
		} else {
			// Fracaso
			self.failure(true);
		}
	}
};

		};

		/**
		 * Inicializa la instancia del ViewModel creado con soundGroupActivity.create
		 *
		 * @param {object} instance Intancia del VM de knockout
		 */
		soundGroupActivity.run = function (instance) {
			ko.cleanNode($('#main-container')[0]);
			ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
			ko.applyBindings(instance, $('#main-container')[0]);
		};

		return soundGroupActivity;
});

lizSoundGroup.directive('soundGroup', function  (soundGroupActivity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			description: '@'
		},
		templateUrl: '../views/activities/sound_group.html',
		link: function postLink(scope, element, attrs) {
			soundGroupActivity.run(soundGroupActivity.create(scope.options));
		}
	}; 
});


var lizSoundGroups = angular.module('lizSoundGroups', []);

lizSoundGroups.factory('soundGroupsActivity', function ($rootScope) {

	var soundGroupsActivity = {};

	/**
	 * Crea el ViewModel
	 */
	soundGroupsActivity.create = function (options) {
		return new soundGroupsActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		options						Opciones a utilizar.
	 *
	 * @param {integer}		options.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		options.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {function}	options.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	options.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 *
	 */
	soundGroupsActivity._ViewModel = function (options) {
		var self = this;

	// Sonido de grupo
	self.sound = ko.observable(options.sound);

	// Variables para sortables
	self.items = ko.observableArray(options.items);

	ko.utils.arrayForEach(self.items(), function (item) {
		if(! item.hasOwnProperty('answer')) item.answer = true;
		if(! item.hasOwnProperty('startsInGroup')) item.startsInGroup = false;
	});

	self.group = ko.observableArray(self.items.remove(function(item){
		return item.startsInGroup;
	}));

	// Ruta a la carpeta de imágenes
	self.resources = $rootScope.resources;

	// Disparador de preguntas correctas/incorrectas
	self.rightAnswer = ko.observable();
	self.wrongAnswer = ko.observable();

	self.success = ko.observable(false);
	self.failure = ko.observable(false);

	self.rightAnswers = 0;

	self.chances = options.chances ? options.chances : options.items.length;

	/**
	 * reproducir sonido
	 */
	self.playSound = function () {
		$('#audio-group')[0].play();
	};


	/**
	 * Obtiene los estilos de cada elemento
	 */
	self.getStyles = function (item) {
		var styles = '';

		if(! item.answer) return;

		styles += 'width: ' + item.w + '%;';
		styles += 'height: ' + item.h + '%;';
		styles += 'top: ' + item.t + '%;';
		styles += 'left: ' + item.l + '%;';

		return styles;
	}

/**
 *	Función que se ejecuta al soltar el objeto dentro del contenedor
 */
self.verifyAnswer = function (arg) {

	// No hacer nada y salir de la función, si el elemento se soltó en el mismo grupo inicial
	if(arg.sourceParent() == arg.targetParent()) return;

	// Calculamos si la respuesta es correcta o no usando la propiedad 'answer'
	if (arg.item.answer) {
		// Respuesta correcta
		self.rightAnswer(arg.item);
		self.rightAnswers++;

		// Llama a la función de respuesta buena
		if (typeof options.rightAnswerCallback !== "undefined") options.rightAnswerCallback();

	} else {
		// Respuesta Incorrecta
		self.wrongAnswer(arg.item);
		arg.cancelDrop = true; // Devuelve el elemento a su posición origina
	}

	// Reducimos las posibilidades
	self.chances--;

	// Fin de la actividad
	if (self.chances === 0) {
		if(self.rightAnswers >= options.minRightAnswers) {
			// éxito
			self.success(true);

			// Llama a la función de éxito
			if (typeof options.successCallback !== "undefined") options.successCallback();

			// Activamos la siguiente ruta
			$rootScope.isNextEnabled = true;
		} else {
			// Fracaso
			self.failure(true);
		}
	}
};

		};

		/**
		 * Inicializa la instancia del ViewModel creado con soundGroupActivity.create
		 *
		 * @param {object} instance Intancia del VM de knockout
		 */
		soundGroupsActivity.run = function (instance) {
			ko.cleanNode($('#main-container')[0]);
			ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
			ko.applyBindings(instance, $('#main-container')[0]);
		};

		return soundGroupsActivity;
});

lizSoundGroups.directive('soundGroups', function  (soundGroupsActivity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			description: '@'
		},
		templateUrl: '../views/activities/sound_groups.html',
		link: function postLink(scope, element, attrs) {
			soundGroupsActivity.run(soundGroupsActivity.create(scope.options));
		}
	}; 
});


/**
 * Actividad donde los elementos pueden ser arrastrados en múltiples grupos desde una pila definida
 */
var lizStackMultiple = angular.module('lizStackMultiple', []);

lizStackMultiple.factory('stackMultipleActivity', function ($rootScope, shuffleArrayFactory) {

	var stackMultipleActivity = {};

  /**
   * Crea el ViewModel
   */
  stackMultipleActivity.create = function (options) {
    return new stackMultipleActivity._ViewModel(options);
  };

	/**
	 * Genera el ViewModel de la actividad con las siguientes opciones
	 *
	 *
	 */
	stackMultipleActivity._ViewModel = function (options) {
		var self = this,
			tempItem = {}, // variable auxiliar para añadir nuevos elementos al stack
			stackCounter = 0, // Variable para poner Id's a elementos clonados
			tempStack = []; // Array auxiliar que después será ordenado aleatoriamente

		self.groups = ko.observableArray([]);
		self.stack = ko.observableArray([]);
		self.resources = $rootScope.resources; // Carpeta de recursos desde angular
		self.maxElementsPerGroup = options.hasOwnProperty('maxElementsPerGroup') ? options.maxElementsPerGroup : 2;

		// Triggers que se activan cuando la respuesta es correcta/incorrecta
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		// Triggers cuando la actividad termina satisfactoria y/o insatisfactoriamente
		self.success = ko.observable(false);

		/**
		 * Clase para los grupos
		 */
		self.Group = function (options) {
			this.name = options.name;
			this.sortable = ko.observableArray([]);
			this.sortable._array = this.sortable;

			this.min = options.hasOwnProperty('min') ? options.min : 0;
			this.max = options.hasOwnProperty('max') ? options.max : 99;
		};

		// Constructor de los grupos
		ko.utils.arrayForEach(options.groups, function(group){
			self.groups.push(new self.Group(group));
		});

		// Constructor del stack
		ko.utils.arrayForEach(options.stack, function(item){

			// Procesamos cada elemento para pasarlo al stack
			if(! item.hasOwnProperty('copies')) item.copies = 1;

			stackCounter++;

			// Creamos las copias
			for(var i=0; i < item.copies; i++){

				tempItem = $.extend(true, {}, item);

				tempItem._id = stackCounter; // definimos un id idéntico a las copias
				tempItem.serial = (Math.random() + 1).toString(36).substring(7); // Clave primaria

				tempStack.push(tempItem); // Añade el elemento

			}

		});

		// Añadimos el array a self.stack
		self.stack(shuffleArrayFactory.run(tempStack));

		/**
		 * Función que se ejecuta cada vez que se suelta un elemento
		 * El objetivo es revisar los elementos para definir las condiciones 
		 * propuestas por el desarrollador en cada grupo
		 */
		self.verifyAfter = function (arg) {
			var item = arg.item,
				filteredArray = [], // variable que recibe los elementos filtrados del array
				wrongElement = {}, // elemento removido en caso de que ya exista el elemento en la lista
				arrayTarget = arg.targetParent._array; // Puntero al arreglo de objetos del objetivo


			// Cuando es el mismo destino
			if(arg.sourceParent === arg.targetParent) return;


			// Filtramos el array en busca de elementos repetidos
			filteredArray = arrayTarget().filter(function(elem){
				return elem._id === item._id;
			});


			// Si es mayor a 1, entonces hay elementos repetidos
			if(filteredArray.length > 1){
				// Respuesta Incorrecta	
				self.wrongAnswer(item);

				// Removemos el elemento y lo lanzamos de nuevo al stack
				wrongElement = arrayTarget.remove(function(elem){
					return elem.serial === item.serial;
				})[0];

				// Devolvemos el elemento al stack
				self.stack.push(wrongElement);

			} else {
				// Respuesta Correcta
				self.rightAnswer(item);
			}

			// Analizamos las condiciones para así activar el botón de siguiente
			var condition = true;

			ko.utils.arrayForEach(self.groups(), function(group){
				// mínimos
				if(group.sortable().length >= group.min )
					condition = condition && true; 
				else
					condition = condition && false; 

				// máximos
				if(group.sortable().length <= group.max)
					condition = condition && true; 
				else
					condition = condition && false; 
			});

			// Activamos / desactivamos el botón de siguiente 
			if(condition) 
				$rootScope.isNextEnabled = true;
			else 
				$rootScope.isNextEnabled = false;

			// Aplicamos el cambio del scope
			$rootScope.$apply();

		}

		/**
		 * Función que se ejecuta al dar click en siguiente
		 */
		$rootScope.beforeGoNext = function () {
			self.success(true);
			return true;
		};

		/**
		 * Define si el target esta lleno utilizando self.maximumElements
		 */
		self.isContainerFull = function (parent) {
			return parent().length < self.maxElementsPerGroup;
		};

		/**
		 * Estilos de los grupos
		 */
		self.getGroupStyles = function () {
			 return "width: " + (100 / self.groups().length) + "%;";
		}

	};

	/**
	 * Inicializa la instancia del ViewModel creado con stackMultipleActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	stackMultipleActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.afterMove = instance.verifyAfter;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return stackMultipleActivity;

});

lizStackMultiple.directive('stackMultiple', function  (stackMultipleActivity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			description: '@',
			audio: '@'
		},
		transclude: true,
		templateUrl: '../views/activities/stack_multiple.html',
		link: function postLink(scope, element, attrs) {
			// Definimos los contenedores y los elementos transcluídos
			var groupContainer = element.find('.group .item'),
				itemContainer = element.find('.stack .item');

			// Se añade cada uno de los hijos a la plantilla en la posición adecuada
			angular.forEach(element.find('.transcluded item').clone().children(), function (elem) { groupContainer.append(elem); });
			angular.forEach(element.find('.transcluded item').clone().children(), function (elem) { itemContainer.append(elem); });

			// Se elimina el elemento transcluded del DOM
			element.find('.transcluded').remove();

			// Iniciar Knockout
			stackMultipleActivity.run(stackMultipleActivity.create(scope.options));
		}
	}; 
});

var lizTablePath = angular.module('lizTablePath', []);

lizTablePath.directive('tablePath', function  () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			imgLeft: '@',
			imgLeftAlt: '@',
			imgRight: '@',
			imgRightAlt: '@',
			titlehead: '@',
			audio: '@',
			instruction: '@',
			description: '@'
		},
		templateUrl: '../views/activities/table_path.html',
		link: function (scope, element, attrs) {
			var opt = scope.options,
				path = opt.path.slice(0), // Camino a elegir por el estudiante
				rightAnswers = 0, // Contador de respuestas correctas
				chances = opt.chances, // Se puede equivocar este número de eces
				rows = opt.table.length, 
				cols = opt.table[0].length;

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;

			// Calificación
			scope.rightAnswer = false;
			scope.wrongAnswer = false;
			scope.success = false;
			scope.failure = false;

			scope.table = [];

			// Llenamos la tabla
			for(var i = 0; i < rows; i++) {
				scope.table.push([]); // Añade el nuevo array

				for(var j = 0; j < cols; j++) {
					scope.table[i].push({
						x: j,
						y: i,
						text: opt.table[i][j]
					});
				}
			}

			/** 
			 * Verifica si la celda pertenece al camino.
			 */
			scope.verify = function (cell) {
				// Si hay elementos en el path
				if(cell.x === path[0][0] && cell.y === path[0][1]) {
					// Respuesta correcta
					cell.completed = true; // Marcamos la casilla como completa
					scope.rightAnswer = Math.random(); // Disparador de respuesta
					path.shift(); // Eliminamos el primer elemento
				} else {
					scope.wrongAnswer = Math.random(); // Disparador de respuesta
					chances --;

					if(chances === 0) {
						scope.failure = true;
					}
				}

				// Fin de la actividad exitoso
				if(path.length === 0) {
					scope.$root.isNextEnabled = true;
					scope.success = true;
				}
			};
			

		}
	}; 
});

var lizTablePathInstruction = angular.module('lizTablePathInstruction', []);

lizTablePathInstruction.directive('tablePathInstruction', function  () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			img: '@',
			imgAlt: '@',
			titlehead: '@',
			audio: '@',
			instruction: '@',
			description: '@'
		},
		templateUrl: '../views/activities/table_path_instruction.html',
		link: function (scope, element, attrs) {
			var opt = scope.options,
				path = opt.path.slice(0), // Camino a elegir por el estudiante
				rightAnswers = 0, // Contador de respuestas correctas
				chances = opt.chances, // Se puede equivocar este número de eces
				rows = opt.table.length, 
				cols = opt.table[0].length;

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;
			scope.instructions = opt.instructions; // las intrucciones a seguir 
			// Calificación
			scope.rightAnswer = false;
			scope.wrongAnswer = false;
			scope.success = false;
			scope.failure = false;

			scope.table = [];

			// Llenamos la tabla
			for(var i = 0; i < rows; i++) {
				scope.table.push([]); // Añade el nuevo array

				for(var j = 0; j < cols; j++) {
					scope.table[i].push({
						x: j,
						y: i,
						text: opt.table[i][j]
					});
				}
			}

			/** 
			 * Verifica si la celda pertenece al camino.
			 */
			scope.verify = function (cell) {
				// Si hay elementos en el path
				if(cell.x === path[0][0] && cell.y === path[0][1]) {
					// Respuesta correcta
					cell.completed = true; // Marcamos la casilla como completa
					scope.rightAnswer = Math.random(); // Disparador de respuesta
					path.shift(); // Eliminamos el primer elemento
				} else {
					scope.wrongAnswer = Math.random(); // Disparador de respuesta
					chances --;

					if(chances === 0) {
						scope.failure = true;
					}
				}

				// Fin de la actividad exitoso
				if(path.length === 0) {
					scope.$root.isNextEnabled = true;
					scope.success = true;
				}
			};
			

		}
	}; 
});

var lizTangram = angular.module('lizTangram', []);

lizTangram.directive('tangram', function  (shuffleArrayFactory) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			description: '@'
		},
		templateUrl: '../views/activities/tangram.html',
		link: function postLink(scope, element, attrs) {

			var opt = scope.options;

			// variables básicas de la acividad de angular
			scope.rightAnswer = false;
			scope.wrongAnswer = false;
			scope.success = false;
			scope.failure = false;
			
			scope.started = false;

			/**
			 * Muestra el canvas
			 */
			scope.start = function () {
				scope.started = true;
				scope.startCanvas();
			};


			/**
			 * Inicializa el canvas
			 */
			scope.startCanvas = function () {
				var tempPos = {}, // Posición temporal que tiene el objeto
					bs = 50, // blockSize: tamaño de los lados del bloque http://www.logicville.com/tangram1.htm
					hypotenuse = Math.sqrt( 2 * Math.pow(bs, 2) ), // tamaño de la hipotenusa
					finalFigure = {}, // Figura a armar
					figs = [], // Contenedor temporal para el array de figuras
					chances = opt.chances, // número total de posibilidades
					TOTAL_FIGURES = 7, // Número total de figuras
					completedFigures = 0; // Contador para figuras completas

				// Plantillas de las figuras. Basado en http://www.logicville.com/tangram1.htm
				var templates = {
					"bigTriangle": {
						"points": [ 
							0, 0,		
							bs*2, bs*2,		
							0, bs*4 
						],
						"offset": { x: bs, y: bs * 2 }
					},
					"mediumTriangle": {
						"points": [ 
							0, 0,		
							bs*2, 0,		
							0, bs*2
						],
						"offset": { x: hypotenuse / 2, y: hypotenuse / 2 }
					},
					"smallTriangle": {
						"points": [ 
							0, 0,		
							bs*2, 0,
							bs, bs
						],
						"offset": { x: bs, y: bs / 2 }
					},
					"square": {
						"points": [ 
							0, 0,		
							hypotenuse, 0,
							hypotenuse, hypotenuse,
							0, hypotenuse
						],
						"offset": { x: hypotenuse / 2, y: hypotenuse / 2 }
					},
					"rhomboid": {
						"points": [ 
							0, 0,
							bs, bs,
							bs*3, bs,
							bs*2, 0,
						],
						"offset": { x: bs * 1.5, y: bs * 0.5 }
					},
				};

				var stage = new Kinetic.Stage({
					container: 'kinetic-container',
					width: 960,
					height: 650
				});

				var layer = new Kinetic.Layer();

				var tangramFigures = new Kinetic.Group({ x: 0, y: 0 }); // Figuras iniciales
				var macros = new Kinetic.Group({ x: 0, y: 0 }); // Macros

				// rectángulos donde van la muestra y la figura objetivo
				var leftRect = new Kinetic.Rect({
					width: 455,
					height: 410,
					stroke: opt.color,
					strokeWidth: 2
				});
				macros.add(leftRect);

				// Rectángulo derecho
				macros.add(new Kinetic.Rect({
					x: 475,
					width: 455,
					height: 410,
					stroke: opt.color,
					strokeWidth: 2
				}));

				// Nombre de la figura
				var tangramName = new Kinetic.Text({
					text: opt.name,
					fontFamily: 'century_gothic',
					fontSize: 20,
					x: leftRect.getX(),
					y: leftRect.getY(),
					width: leftRect.getWidth(),
					padding: 10,
					align: 'center',
					fill: 'white'
				});

				// Fondo del nombre
				macros.add(new Kinetic.Rect({
					x: leftRect.getX(),
					y: leftRect.getY(),
					width: leftRect.getWidth(),
					height: tangramName.getHeight(),
					fill: opt.color
				}));

				macros.add(tangramName); // Agregamos el nombre sobre el rectángulo



				// Cuadro de texto con la descripción
				var descriptionGroup = new Kinetic.Group({ x: 0, y: 0 });

				var descriptionText = new Kinetic.Text({
					text: 'Arrastra hasta el recuadro las piezas del tangram y arma la figura que tienes como muestra.',
					fontFamily: 'century_gothic',
					fontSize: 20,
					width: stage.getWidth(),
					padding: 10,
					align: 'center',
					fill: 'white'
				});

				descriptionGroup.add(new Kinetic.Rect({
					width: stage.getWidth(),
					height: descriptionText.getHeight(),
					fill: opt.color
				}));

				descriptionGroup.add(descriptionText);

				// ===========================================================================
				// Inicio - creación de figuras
				// ===========================================================================
				// triángulo naranja
				tangramFigures.add(new Kinetic.Line({
					points: templates.bigTriangle.points,
					offset: templates.bigTriangle.offset,
					fill: '#F19700',
					id: 'triangleOrange',
					closed: true
				}));

				// triángulo verde
				tangramFigures.add(new Kinetic.Line({
					points: templates.bigTriangle.points,
					offset: templates.bigTriangle.offset,
					fill: '#70A83B',
					id: 'triangleGreen',
					closed: true
				}));

				// Romboide morado
				var rhomboid = new Kinetic.Line({
					points: templates.rhomboid.points,
					offset: templates.rhomboid.offset,
					fill: '#BA007C',
					id: 'rhomboid',
					closed: true
				});

				// para manejar imágenes espejadas
				if(opt.pos[2].scale){
					rhomboid.scale( opt.pos[2].scale );
				}
				tangramFigures.add(rhomboid);
				
				// triángulo amarillo
				tangramFigures.add(new Kinetic.Line({
					points: templates.mediumTriangle.points,
					offset: templates.mediumTriangle.offset,
					fill: '#FEEE00',
					id: 'triangleYellow',
					closed: true
				}));

				// cuadro rojo
				tangramFigures.add(new Kinetic.Line({
					points: templates.square.points,
					offset: templates.square.offset,
					fill: '#BF0411',
					id: 'square',
					closed: true
				}));

				// triángulo azul 1
				tangramFigures.add(new Kinetic.Line({
					points: templates.smallTriangle.points,
					offset: templates.smallTriangle.offset,
					fill: '#009BDB',
					id: 'triangleBlue1',
					closed: true
				}));

				// triángulo azul 2
				tangramFigures.add(new Kinetic.Line({
					points: templates.smallTriangle.points,
					offset: templates.smallTriangle.offset,
					fill: '#009BDB',
					id: 'triangleBlue2',
					closed: true
				}));

				// Clonamos el grupo de figuras para poder armar la figura final
				finalFigure = tangramFigures.clone();


				// ===========================================================================
				// Configuración de cada elemento - propiedades comunes
				// ===========================================================================
				tangramFigures.getChildren().forEach(function (f) {
					// Definimos los atributos comunes
					f.setAttrs({
						draggable: true, 
						stroke: 'black',
						strokeWidth: 1
					});


					// ===========================================================================
					// Eventos
					// ===========================================================================
					f.on('mouseover', function () {
						// Guardamos la posición temporal, por si es necesario retornar el elemento al punto
						tempPos.x = this.getX();
						tempPos.y = this.getY();
					});

					f.on('dragstart', function (e) {
						this.moveToTop(); // Cuando se empieza a arrastrar el elemento, se pone al tope
						layer.draw(); // Redibujamos la capa
					});

					/**
					 * La idea es identificar la figura en base al punto de intersección y luego verificar si
					 * la respuesta es correcta o incorrecta
					 */
					f.on('dragend', function (e) {
						var pos = this.getAbsolutePosition(); // Obtenemos la posición absoluta

						// Movemos el elemento, para poder obtener la intersección que deseamos
						this.setAttrs({ x: tempPos.x, y: tempPos.y });
						layer.draw();

						// Buscamos el elemento con la intersección de puntos
						var shape = this.getStage().getIntersection({ x: pos.x, y: pos.y });

						if(!shape) return; // no hay figura
						if(shape.getAttr('_type') !== 'target') return; // No es un objetivo

						if(this.getId() === shape.getId()){
							// Respuesta Correcta
							this.setAbsolutePosition( shape.getAbsolutePosition() ); // Ponemos el elemento exactamente sobre el objetivo
							this.setDraggable(false); // desactivamos el draggable
							layer.draw(); 

							scope.rightAnswer = Math.random();
							completedFigures++;
						} else {
							// Respuesta Incorrecta
							scope.wrongAnswer = Math.random();
						}

						chances--; // Reducimos las posibilidades

						/**
						 * Evaluamos si la actividad se ha terminado
						 */
						if(chances === 0 || completedFigures === TOTAL_FIGURES){
							if(completedFigures === TOTAL_FIGURES){
								// éxito
								scope.success = true;
								scope.$root.isNextEnabled = true;
							} else {
								// fracaso
								scope.failure = true;
							}
						}

						scope.$apply(); // Aplicamos el scope para poder ver los íconos de correcto / incorrecto

					});
				});

				/**
				 * Propiedades del puntero al pasar el mouse por encima
				 */
				tangramFigures.on('mouseover', function () {
					document.body.style.cursor = 'pointer';
				});

				tangramFigures.on('mouseout', function () {
					document.body.style.cursor = 'default';
				});

				// ===========================================================================
				// Configuración personal de la actividad
				// ===========================================================================
				figs = tangramFigures.getChildren(); // Array con las figuras del tangram

				// Configuración de las figuras
				for(var i=0; i < opt.pos.length; i++){
					// Movemos cada figura según la posición
					figs[i].move({
						x: opt.pos[i].x,
						y: opt.pos[i].y
					});

					if(opt.pos[i].hasOwnProperty('rot')){
						figs[i].setRotation(opt.pos[i].rot); // rotamos la figura
					}
				}

				// ===========================================================================
				// Configuración de la figura final
				// ===========================================================================
				figs = finalFigure.getChildren(); // Array con las figuras del tangram

				for(var i=0; i < opt.figure.length; i++){
					// Añadimos el borde a cada una
					figs[i].setAttrs({
						stroke: 'black',
						strokeWidth: 1
					});

					// Movemos cada figura según la posición
					figs[i].move({
						x: opt.figure[i].x,
						y: opt.figure[i].y
					});

					if(opt.figure[i].hasOwnProperty('rot')){
						figs[i].setRotation(opt.figure[i].rot); // rotamos la figura
					}
				}

				// ===========================================================================
				// Configuración de la figura objetivo
				// ===========================================================================
				targetFigure = finalFigure.clone(); // Clonamos de la figura final

				targetFigure.getChildren().forEach(function (child) {
					child.setFill('white'); // Quitamos el fondo de cada figura
					child.setAttr('_type', 'target'); // Definimos un tipo especial para identificar los targets
				});

				// ===========================================================================
				// Configuración Final
				// ===========================================================================
				// Movemos los grupos
				macros.move({ x: 15, y: 220 });
				finalFigure.move({ x: 160, y: 400 });
				targetFigure.move({ x: 660, y: 400 });
				tangramFigures.move({ x: 90, y: 130 });

				// Agregamos todo
				layer.add(macros);
				layer.add(descriptionGroup);
				layer.add(targetFigure);
				layer.add(finalFigure);
				layer.add(tangramFigures);
				stage.add(layer);
				
			};
			
		}
	}; 
});

var lizTenThousandNumbers = angular.module('lizTenThousandNumbers', ['factories']);

lizTenThousandNumbers.directive('tenThousandNumbers', function  (shuffleArrayFactory) {
	return {
		restrict: 'E',
		scope: {
			description: '@',
			audio: '@'
		},
		templateUrl: '../views/activities/ten_thousand_numbers.html',
		link: function (scope, element, attrs) {
			scope.numberText = ''; // número convertido a texto
			scope.chances = 10;

			scope.selectedRange = 0; // Rango seleccionado
			scope.selectedBigRange = false; // gran rango seleccionado
			scope.bigRanges = [
				[1000, 1999],
				[2000, 2999],
				[3000, 3999],
				[4000, 4999],
				[5000, 5999],
				[6000, 6999],
				[7000, 7999],
				[8000, 8999],
				[9000, 9999],
			];

			scope.numberMatrix = []; // array multidimensional para la tabla
			scope.rangesLeft = [];
			scope.rangesRight = [];

			// Calificación
			scope.success = false;

			/**
			 * Selecciona el gran rango
			 */
			scope.selectBigRange = function (range) {
				scope.selectedBigRange = range;
			};

			// cada vez que cambia, se generan los rangos de izquierda y derecha
			scope.$watch('selectedBigRange', function (val) {
				if(val) {
					scope.rangesLeft.length = 0;
					scope.rangesRight.length = 0;

					for(var i = 0; i < 5; i++) {
						scope.rangesLeft.push([
							val[0] + (100 * i),
							val[0] + (100 * (i + 1)) - 1,
						]);
					}

					for(var i = 5; i <= 9; i++) {
						scope.rangesRight.push([
							val[0] + (100 * i),
							val[0] + (100 * (i + 1)) - 1,
						]);
					}
				}
			});

			/**
			 * Define el rango seleccionado
			 */
			scope.selectRange = function (range) {
				scope.numberMatrix.length = 0; // Se vacía el array
				scope.selectedRange = range; // seleccionamos el rango

				var temp = [],
					arrayIndex = 0,
					counter = 0;

				// Llenamos el array con los números
				scope.numberMatrix.push([]); // Añadimos el primer array
				temp = scope.numberMatrix[arrayIndex];

				for(var i = range[0]; i <= range[1]; i++){
					temp.push(i);
					counter++;

					// Cada 10, cambiamos de array. Además, si es el último número, no añadimos un nuevo array
					if(counter === 10 && (i !== range[1])){
						counter = 0;	
						arrayIndex++;

						// Añadimos el array nuevo y cambiamos el índice
						scope.numberMatrix.push([]); // Añadimos el primer array
						temp = scope.numberMatrix[arrayIndex];
					}
				}
			};

			
			/**
			 * Convierte un número en palabras.
			 *
			 * Para hacerlo, la función va filtrando el número desde la mayor cifra (centenas, decenas... hasta unidades)
			 * después de cada filtro, se elimina la última cifra para poder pasar el número por siguiente filtro hasta
			 * llegar a las unidades.
			 *
			 * Rango actual: 1 al 999
			 *
			 * @param {integer} number número a convertir
			 * @return {Object} con 2 propiedades: text y intervals
			 *
			 */
			function numberToWords(number) {
				var res = ''; // Número en palabras

				number = parseInt(number);

				var units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
				var tens = ['', '', 'veinti', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];

				// =============================
				// Unidades de mil
				// =============================
				var uc = Math.floor(number / 1000);

				if(uc > 0) {
					if(uc === 1) {
						res += "mil "
					} else {
						res += units[uc] + " mil ";
					}

					number = number - (uc * 1000); // Eliminamos las unidades de mil
				}

				// =============================
				// Centenas
				// =============================
				var c = Math.floor(number / 100);

				// Cien
				if(number === 100){ 
					res += 'cien'; 
				} 
				else if(c > 0){
					if(c === 1){ 
						res += 'ciento '; 
					} else{
						// Casos especiales
						if(c === 5){ res += 'quinientos';  }
						else if(c === 7){ res += 'setecientos';  }
						else if(c === 9){ res += 'novecientos';  }
						else { 
							// Para el resto de centenas, se añaden las unidades al inicio
							res += units[c] + 'cientos';
						} 

						if(number % 100 !== 0){ res += ' ' } // Si el número no es redondo, añadimos un espacio
					}

					number = number - (c * 100); // Eliminamos las centenas
				}

				// =============================
				// Decenas
				// =============================
				var t = Math.floor(number / 10);

				if(number === 20) {
					res += 'veinte';
				} else if(t >= 2 && t <= 9){
					res += tens[t]; // Añadimos la cadena de decenas

					// Agregamos el " y " si es mayor a 2
					if(t > 2 && number % 10 !== 0){ 
						res += ' y '; 
					} 

					number = number % 10; // Eliminamos las decenas del número
				}

				// =============================
				// Unidades y números hasta el veinte
				// =============================
				if(number < 10){
					res += units[number];
				} else if(number >= 10 && number < 20) {
					// del diez al quince
					if(number === 10) { res += 'diez'; }
					if(number === 11) { res += 'once'; }
					if(number === 12) { res += 'doce'; }
					if(number === 13) { res += 'trece'; }
					if(number === 14) { res += 'catorce'; }
					if(number === 15) { res += 'quince'; }

					// Deiciseis en adelante
					if(number > 15 && number < 20){ 
						res += 'dieci' + units[number % 10]; 
					} 
				} 

				return {
					text: res
				};

			}; // numberToWords()
			

			/**
			 * Función pricipal. Recibe un número, define el texto y lo reproduce
			 */
			scope.chooseNumber = function (number) {
				var result = numberToWords(number);

				scope.numberText = result.text; // Muestra el texto
				scope.chances--;

				// Reducimos las posibilidades, para llegar al final de la actividad
				if(scope.chances === 0){
					scope.$root.isNextEnabled = true;
					scope.$root.beforeGoNext = function () {
						scope.success = true;
						return true;
					}
				}

			};

			console.log(
				numberToWords(1099),
				numberToWords(1199),
				numberToWords(3199)
			);


		}
	}; 
});

/**
 * La actividad para escribir textos largos.
 */

 var lizTextActivity = angular.module('lizTextActivity', []);

 lizTextActivity.directive('textActivity', function () {
 	return {
 		restrict: 'E',
 		templateUrl: '../views/activities/text_activity.html',
 		scope: {
 			options: '=',
 			title: '@',
 			description: '@',
 			instruction: '@',
 			audio: '@'
 		},
 		link: function (scope, iElement, iAttrs) {
 			console.log(scope);
 			// Inputs procesados
			scope.words = [];

			// Procesamos cada elemento del array entrante
			angular.forEach(scope.inputs, function (input) {
				scope.words.push({ word: input, right: false, wrong: false });
			});

 			scope.numLines = scope.options.numLines;
 			scope.complete = false;
 			scope.success = false;
			scope.failure = false;
			scope.block = false;
			scope.right = false;
			scope.wrong = false;

			scope.$watch('complete', function(complete) {
				if (complete) {
					if (scope.numCharacters === scope.options.numCharacters) {
						// éxito
						scope.success = true;

						// Activamos la siguiente actividad o ruta
						scope.$root.isNextEnabled = true;
					} else {
						// fracaso
						scope.failure = true;
					}
				} 
			});

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;

			var chances = scope.options.chances-1;

			scope.verify = function (input) {
				var letters = /^[A-Za-z]+$/,
					value = $("#text_activity_box").text(),
					lineHeight = parseInt($("#text_activity_box").css("line-height"));

					

				if (value === "" || value === null || value === "Escribe aqui...") { return; }

				var totalHeight = parseInt($("#text_activity_box").height()),
					lineUsed = totalHeight / lineHeight;

				console.log(totalHeight);

				if((value.match(letters) !== null) && (lineUsed >= scope.numLines)) {
                    
                    	
                	scope.wrong = false;
                    scope.right = true;
                    scope.block = true;
                    scope.numCharacters = scope.options.numCharacters;
                                                                   
                } else {
	                    	
                    	scope.wrong ? chances=scope.options.chances-2: chances=scope.options.chances-1;

                    	scope.wrong = true;
                    	

	                    	if(chances === 0){
	                    	scope.block = true;
	                    	chances=scope.options.chances-1;
	                    	}else{
	                    		chances--;value = "";
	                    		$('#text_activity_box').text("");
								$("#text_activity_box").focus();
	                    	}
            	}
                    	
                if (chances === 0) {
                	if ((value.match(letters) !== null) && (lineUsed >= scope.numLines)) {
						// éxito
						scope.success = true;

						// Activamos la siguiente actividad o ruta
						scope.$root.isNextEnabled = true;
					} else {
						// fracaso
						scope.failure = true;
					}
                }

			}


 		}
 	};
 });
var lizThousandNumbers = angular.module('lizThousandNumbers', ['factories']);

lizThousandNumbers.directive('thousandNumbers', function  (shuffleArrayFactory) {
	return {
		restrict: 'E',
		scope: {
			description: '@',
			audio: '@'
		},
		templateUrl: '../views/activities/thousand_numbers.html',
		link: function postLink(scope, element, attrs) {

			scope.selectedRange = 0; // Rango seleccionado
			scope.numberMatrix = []; // array multidimensional para la tabla
			scope.numberText = ''; // número convertido a texto
			scope.chances = 20; // Debe hacer al menos este número de intentos para pasar
			
			scope.rangesLeft = [
				[100, 199],
				[200, 299],
				[300, 399],
				[400, 499]
			];
			
			scope.rangesRight = [
				[500, 599],
				[600, 699],
				[700, 799],
				[800, 899],
				[900, 999]
			];

			/**
			 * Define el rango seleccionado
			 */
			scope.selectRange = function (range) {
				scope.numberMatrix.length = 0; // Se vacía el array
				scope.selectedRange = range; // seleccionamos el rango

				var temp = [],
					arrayIndex = 0,
					counter = 0;

				// Llenamos el array con los números
				scope.numberMatrix.push([]); // Añadimos el primer array
				temp = scope.numberMatrix[arrayIndex];

				for(var i = range[0]; i <= range[1]; i++){
					temp.push(i);
					counter++;

					// Cada 10, cambiamos de array. Además, si es el último número, no añadimos un nuevo array
					if(counter === 10 && (i !== range[1])){
						counter = 0;	
						arrayIndex++;

						// Añadimos el array nuevo y cambiamos el índice
						scope.numberMatrix.push([]); // Añadimos el primer array
						temp = scope.numberMatrix[arrayIndex];
					}
				}
			};


			/**
			 * Función pricipal. Recibe un número, define el texto y lo reproduce
			 */
			scope.chooseNumber = function (number) {
				var result = numberToWords(number);

				scope.numberText = result.text; // Muestra el texto
				//playAudio(result.intervals); // Reproduce el audio

				scope.chances--;

				// Reducimos las posibilidades, para llegar al final de la actividad
				if(scope.chances === 0){
					scope.$root.isNextEnabled = true;
					scope.$root.beforeGoNext = function () {
						scope.success = true;
						return true;
					}
				}
			};


			// =============================================================================
			// LÓGICA DE SELECCIÓN DE NÚMERO, CAMBIO A PALABRAS Y REPRODUCCIÓN DE SONIDO
			// =============================================================================
			// Intérvalos 
			var intervals = {
				"uno": [0, 0.4],
				"dos": [0.8, 1.4],
				"tres": [1.8, 2.3],
				"cuatro": [2.8, 3.3],
				"cinco": [3.7, 4.3],
				"seis": [4.8, 5.4],
				"siete": [5.8, 6.4],
				"ocho": [6.9, 7.3],
				"nueve": [7.8, 8.3],
				"diez": [8.6, 9.4],
				"once": [9.8, 10.4],
				"doce": [10.8, 11.3],
				"trece": [11.7, 12.5],
				"catorce": [12.7, 13.5],
				"quince": [13.7, 14.5],
				"dieci": [14.6, 15.17],
				"veinte": [15.7, 16.4],
				"veinti": [16.6, 17.25],
				"treinta": [17.6, 18.3],
				"cuarenta": [18.7, 19.5],
				"cincuenta": [19.7, 20.5],
				"sesenta": [20.8, 21.6],
				"setenta": [21.8, 22.8],
				"ochenta": [23.2, 23.8],
				"noventa": [24.1, 24.8],
				"y": [25.2, 25.5],
				"cien": [25.8, 26.5],
				"ciento": [26.9, 27.6],
				"cientos": [28, 28.8],
				"quinientos": [29, 29.9],
				"setecientos": [30.2, 31.4],
				"novecientos": [31.6, 32.7]
			};

			/**
			 * Convierte un número en palabras.
			 *
			 * Para hacerlo, la función va filtrando el número desde la mayor cifra (centenas, decenas... hasta unidades)
			 * después de cada filtro, se elimina la última cifra para poder pasar el número por siguiente filtro hasta
			 * llegar a las unidades.
			 *
			 * Rango actual: 1 al 999
			 *
			 * @param {integer} number número a convertir
			 * @return {Object} con 2 propiedades: text y intervals
			 *
			 */
			function numberToWords(number) {
				var res = '', // Número en palabras
					intervalsArray = []; // Interválo para reproducir

				number = parseInt(number);

				var units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
				var tens = ['', '', 'veinti', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];

				// =============================
				// Centenas
				// =============================
				var c = Math.floor(number / 100);

				// Cien
				if(number === 100){ 
					res += 'cien'; 
					intervalsArray.push(intervals.cien);
				} 
				else if(c > 0){
					if(c === 1){ 
						res += 'ciento '; 
						intervalsArray.push(intervals.ciento);
					} else{
						// Casos especiales
						if(c === 5){ res += 'quinientos'; intervalsArray.push(intervals.quinientos); }
						else if(c === 7){ res += 'setecientos'; intervalsArray.push(intervals.setecientos); }
						else if(c === 9){ res += 'novecientos'; intervalsArray.push(intervals.novecientos); }
						else { 
							// Para el resto de centenas, se añaden las unidades al inicio
							res += units[c] + 'cientos';
							intervalsArray.push(intervals[ units[c] ]);
							intervalsArray.push(intervals.cientos);
						} 

						if(number % 100 !== 0){ res += ' ' } // Si el número no es redondo, añadimos un espacio
					}

					number = number - (c * 100); // Eliminamos las centenas
				}

				// =============================
				// Decenas
				// =============================
				var t = Math.floor(number / 10);

				if(number === 20) {
					res += 'veinte';
					intervalsArray.push(intervals.veinte);
				} else if(t >= 2 && t <= 9){
					res += tens[t]; // Añadimos la cadena de decenas
					intervalsArray.push(intervals[ tens[t] ]);

					// Agregamos el " y " si es mayor a 2
					if(t > 2 && number % 10 !== 0){ 
						res += ' y '; 
						intervalsArray.push(intervals.y);
					} 

					number = number % 10; // Eliminamos las decenas del número
				}

				// =============================
				// Unidades y números hasta el veinte
				// =============================
				if(number < 10){
					res += units[number];
					intervalsArray.push(intervals[ units[number] ]);
				} else if(number >= 10 && number < 20) {
					// del diez al quince
					if(number === 10) { res += 'diez'; intervalsArray.push(intervals.diez) };
					if(number === 11) { res += 'once'; intervalsArray.push(intervals.once) };
					if(number === 12) { res += 'doce'; intervalsArray.push(intervals.doce) };
					if(number === 13) { res += 'trece'; intervalsArray.push(intervals.trece) };
					if(number === 14) { res += 'catorce'; intervalsArray.push(intervals.catorce) };
					if(number === 15) { res += 'quince'; intervalsArray.push(intervals.quince) };

					// Deiciseis en adelante
					if(number > 15 && number < 20){ 
						res += 'dieci' + units[number % 10]; 
						intervalsArray.push(intervals.dieci);
						intervalsArray.push(intervals[ units[number % 10] ]);
					} 
				} 

				return {
					text: res,
					intervals: intervalsArray
				};

			}; // numberToWords()

			/**
			 * Reproduce los intérvalos especificados uno tras otro.
			 * Para ello, usa una función recursiva basada en un array
			 *
			 * @param {array} intervals Matrix de 2 dimensiones. Cada fila tiene tiempo de inicio y final del intervalo
			 */
			function playAudio(intervals) {
				if(intervals.length === 0) return; // Termina la función recursiva

				var audio = $('#audio-numbers')[0]; // Recuperamos el audio

				var actualInterval = intervals.shift(),
					starts = actualInterval[0],
					ends = actualInterval[1];

				audio.currentTime = starts;
				audio.play();

				var interv = setInterval(function() {
					if (audio.currentTime > ends) {
						audio.pause();
						clearInterval(interv);

						if(intervals.length !== 0) playAudio(intervals);
					}
				}, 10);
			}

		}
	}; 
});

var lizThousandPatterns = angular.module('lizThousandPatterns', ['factories']);

lizThousandPatterns.directive('thousandPatterns', function  (shuffleArrayFactory) {
	return {
		restrict: 'E',
		scope: {
			description: '@',
			audio: '@'
		},
		templateUrl: '../views/activities/thousand_patterns.html',
		link: function postLink(scope, element, attrs) {

			scope.selectedRange = 0; // Rango seleccionado
			scope.numberMatrix = []; // array multidimensional para la tabla
			scope.numberText = ''; // número convertido a texto
			scope.chances = 20; // Debe hacer al menos este número de intentos para pasar
			
			scope.rangesRight = [
				[1, 91],
				[10, 91],
			];

			/**
			 * Define el rango seleccionado
			 */
			scope.selectRange = function (range) {
				scope.numberMatrix.length = 0; // Se vacía el array
				scope.selectedRange = range; // seleccionamos el rango

				var temp = [],
					arrayIndex = 0,
					counter = 0;

				// Llenamos el array con los números
				scope.numberMatrix.push([]); // Añadimos el primer array
				temp = scope.numberMatrix[arrayIndex];

				for(var i = range[0]; i <= range[1]; i++){
					temp.push(i);
					counter++;

					// Cada 10, cambiamos de array. Además, si es el último número, no añadimos un nuevo array
					if(counter === 10 && (i !== range[1])){
						counter = 0;	
						arrayIndex++;

						// Añadimos el array nuevo y cambiamos el índice
						scope.numberMatrix.push([]); // Añadimos el primer array
						temp = scope.numberMatrix[arrayIndex];
					}
				}
			};


			/**
			 * Función pricipal. Recibe un número, define el texto y lo reproduce
			 */
			scope.chooseNumber = function (number) {
				var result = numberToWords(number);

				scope.numberText = result.text; // Muestra el texto
				//playAudio(result.intervals); // Reproduce el audio

				scope.chances--;

				// Reducimos las posibilidades, para llegar al final de la actividad
				if(scope.chances === 0){
					scope.$root.isNextEnabled = true;
					scope.$root.beforeGoNext = function () {
						scope.success = true;
						return true;
					}
				}
			};


			// =============================================================================
			// LÓGICA DE SELECCIÓN DE NÚMERO, CAMBIO A PALABRAS Y REPRODUCCIÓN DE SONIDO
			// =============================================================================
			// Intérvalos 
			var intervals = {
				"uno": [0, 0.4],
				"dos": [0.8, 1.4],
				"tres": [1.8, 2.3],
				"cuatro": [2.8, 3.3],
				"cinco": [3.7, 4.3],
				"seis": [4.8, 5.4],
				"siete": [5.8, 6.4],
				"ocho": [6.9, 7.3],
				"nueve": [7.8, 8.3],
				"diez": [8.6, 9.4],
				"once": [9.8, 10.4],
				"doce": [10.8, 11.3],
				"trece": [11.7, 12.5],
				"catorce": [12.7, 13.5],
				"quince": [13.7, 14.5],
				"dieci": [14.6, 15.17],
				"veinte": [15.7, 16.4],
				"veinti": [16.6, 17.25],
				"treinta": [17.6, 18.3],
				"cuarenta": [18.7, 19.5],
				"cincuenta": [19.7, 20.5],
				"sesenta": [20.8, 21.6],
				"setenta": [21.8, 22.8],
				"ochenta": [23.2, 23.8],
				"noventa": [24.1, 24.8],
				"y": [25.2, 25.5],
				"cien": [25.8, 26.5],
				"ciento": [26.9, 27.6],
				"cientos": [28, 28.8],
				"quinientos": [29, 29.9],
				"setecientos": [30.2, 31.4],
				"novecientos": [31.6, 32.7]
			};

			/**
			 * Convierte un número en palabras.
			 *
			 * Para hacerlo, la función va filtrando el número desde la mayor cifra (centenas, decenas... hasta unidades)
			 * después de cada filtro, se elimina la última cifra para poder pasar el número por siguiente filtro hasta
			 * llegar a las unidades.
			 *
			 * Rango actual: 1 al 999
			 *
			 * @param {integer} number número a convertir
			 * @return {Object} con 2 propiedades: text y intervals
			 *
			 */
			function numberToWords(number) {
				var res = '', // Número en palabras
					intervalsArray = []; // Interválo para reproducir

				number = parseInt(number);

				var units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
				var tens = ['', '', 'veinti', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];

				// =============================
				// Centenas
				// =============================
				var c = Math.floor(number / 100);

				// Cien
				if(number === 100){ 
					res += 'cien'; 
					intervalsArray.push(intervals.cien);
				} 
				else if(c > 0){
					if(c === 1){ 
						res += 'ciento '; 
						intervalsArray.push(intervals.ciento);
					} else{
						// Casos especiales
						if(c === 5){ res += 'quinientos'; intervalsArray.push(intervals.quinientos); }
						else if(c === 7){ res += 'setecientos'; intervalsArray.push(intervals.setecientos); }
						else if(c === 9){ res += 'novecientos'; intervalsArray.push(intervals.novecientos); }
						else { 
							// Para el resto de centenas, se añaden las unidades al inicio
							res += units[c] + 'cientos';
							intervalsArray.push(intervals[ units[c] ]);
							intervalsArray.push(intervals.cientos);
						} 

						if(number % 100 !== 0){ res += ' ' } // Si el número no es redondo, añadimos un espacio
					}

					number = number - (c * 100); // Eliminamos las centenas
				}

				// =============================
				// Decenas
				// =============================
				var t = Math.floor(number / 10);

				if(number === 20) {
					res += 'veinte';
					intervalsArray.push(intervals.veinte);
				} else if(t >= 2 && t <= 9){
					res += tens[t]; // Añadimos la cadena de decenas
					intervalsArray.push(intervals[ tens[t] ]);

					// Agregamos el " y " si es mayor a 2
					if(t > 2 && number % 10 !== 0){ 
						res += ' y '; 
						intervalsArray.push(intervals.y);
					} 

					number = number % 10; // Eliminamos las decenas del número
				}

				// =============================
				// Unidades y números hasta el veinte
				// =============================
				if(number < 10){
					res += units[number];
					intervalsArray.push(intervals[ units[number] ]);
				} else if(number >= 10 && number < 20) {
					// del diez al quince
					if(number === 10) { res += 'diez'; intervalsArray.push(intervals.diez) };
					if(number === 11) { res += 'once'; intervalsArray.push(intervals.once) };
					if(number === 12) { res += 'doce'; intervalsArray.push(intervals.doce) };
					if(number === 13) { res += 'trece'; intervalsArray.push(intervals.trece) };
					if(number === 14) { res += 'catorce'; intervalsArray.push(intervals.catorce) };
					if(number === 15) { res += 'quince'; intervalsArray.push(intervals.quince) };

					// Deiciseis en adelante
					if(number > 15 && number < 20){ 
						res += 'dieci' + units[number % 10]; 
						intervalsArray.push(intervals.dieci);
						intervalsArray.push(intervals[ units[number % 10] ]);
					} 
				} 

				return {
					text: res,
					intervals: intervalsArray
				};

			}; // numberToWords()

			/**
			 * Reproduce los intérvalos especificados uno tras otro.
			 * Para ello, usa una función recursiva basada en un array
			 *
			 * @param {array} intervals Matrix de 2 dimensiones. Cada fila tiene tiempo de inicio y final del intervalo
			 */
			function playAudio(intervals) {
				if(intervals.length === 0) return; // Termina la función recursiva

				var audio = $('#audio-numbers')[0]; // Recuperamos el audio

				var actualInterval = intervals.shift(),
					starts = actualInterval[0],
					ends = actualInterval[1];

				audio.currentTime = starts;
				audio.play();

				var interv = setInterval(function() {
					if (audio.currentTime > ends) {
						audio.pause();
						clearInterval(interv);

						if(intervals.length !== 0) playAudio(intervals);
					}
				}, 10);
			}

		}
	}; 
});

var lizTwoGroup = angular.module('lizTwoGroup', []);

// Knockout Pairs Factory
lizTwoGroup.factory('twoGroupActivity', function ($rootScope) {

	var twoGroupActivity = {};

	/**
	 * Crea el ViewModel
	 */
	twoGroupActivity.create = function (options) {
		return new  twoGroupActivity._ViewModel(options);
	}

	/**
	 * Genera el ViewModel de las parejas con sus funcionalidades
	 *
	 * Recibe un objeto con las siguientes propiedades
	 *
	 * @param {object}		opt						Opciones a utilizar.
	 * @param {Array}		opt.data				Información de los elementos. Es necesario que cada una tenga la propiedad:
	 *
	 * 	answer: {boolean} define si la respuesta es correcta o incorrecta y puede ser soltada en el contenedor
	 * 	src: {string} imagen para el elemento
	 * 	alt: {string} texto alternativo
	 *
	 * @param {integer}		opt.chances				Número de posibilidades que tiene el usuario de hacer la actividad
	 * @param {integer}		opt.minRightAnswers		Número mínimo de respuestas correctas
	 * @param {function}	opt.successCallback		Función que se llama cuando se termina la actividad de forma satisfactoria
	 * @param {function}	opt.rightAnswerCallback	Función que se llama cuando la respuesta es correcta
	 * @param {integer}		opt.itemsPerRow			Número de elementos por fila. 3 por defecto
	 * @param {boolean}		opt.priority			Define si el botón de siguiente estará activo desde el inicio
	 *
	 */
	twoGroupActivity._ViewModel = function (opt) {
		var self = this;

		self.groupImg = opt.hasOwnProperty('groupImg') ? opt.groupImg : false;
		self.groupAlt = opt.hasOwnProperty('groupAlt') ? opt.groupAlt : false;

		// Observables 
		self.items = ko.observableArray(opt.data);
		self.target = ko.observableArray();

		// Propiedades por defecto, si no existen
		ko.utils.arrayForEach(self.items(), function(item){
			if(! item.hasOwnProperty('answer')) item.answer = true;
			if(! item.hasOwnProperty('title')) item.title = ''; 
			if(! item.hasOwnProperty('text')) item.text = false; 
		});

		// Ruta a la carpeta de imágenes
		self.resources = $rootScope.resources;
		self.itemsPerRow = typeof opt.itemsPerRow !== "undefined" ? opt.itemsPerRow : 3;

		// Disparador de preguntas correctas/incorrectas
		self.rightAnswer = ko.observable();
		self.wrongAnswer = ko.observable();

		self.success = ko.observable(false);
		self.failure = ko.observable(false);

		self.rightAnswers = 0;

		self.chances = opt.chances ? opt.chances : opt.data.length;
		self.totalRightAnswer = opt.totalRightAnswer ? opt.totalRightAnswer : opt.data.length;
		self.priority = opt.priority

		// audio
		self.audio = ko.observable(opt.audio);

		/**
		 * Reproduce el audio de la instrucción.
		 */
		self.playAudio = function () {
			$('#audio-instruction')[0].play();
		};

		/**
		 *	Función que se ejecuta al soltar el objeto dentro del contenedor
		 */
		self.verifyAnswer = function (arg) {

			// No hacer nada y salir de la función, si el elemento se soltó en el mismo grupo inicial
			if(arg.sourceParent() == arg.targetParent()) return;

			// Calculamos si la respuesta es correcta o no usando la propiedad 'answer'
			if (arg.item.answer) {
				// Respuesta correcta
				self.rightAnswer(arg.item);
				arg.cancelDrop = true;
				self.rightAnswers++;
        	// Llama a la función de respuesta buena
			if (typeof opt.rightAnswerCallback !== "undefined") opt.rightAnswerCallback();
			} else {
				// Respuesta Incorrecta
				self.wrongAnswer(arg.item);
				arg.cancelDrop = true; // Devuelve el elemento a su posición origina
			}
		

			// Reducimos las posibilidades
			self.chances--;

			// Fin de la actividad
			if (self.chances === 0 || self.rightAnswers >= self.totalRightAnswer ) {
				if(self.rightAnswers >= opt.minRightAnswers) {
					// éxito
					self.success(true);

					// Llama a la función de éxito
					if (typeof opt.successCallback !== "undefined") opt.successCallback();

					// Eliminamos beforeGoNext, si existe
					if(self.priority){
						$rootScope.beforeGoNext = undefined; // Limpiamos la función	
					}

					// Activamos la siguiente ruta
					$rootScope.isNextEnabled = true;

				} else {
					// Fracaso
					self.failure(true);
				}
			}

			// Si hay prioridad, activa/desactiva el botón de siguiente
			if(self.priority){
				if(self.rightAnswers >= opt.minRightAnswers) $rootScope.isNextEnabled = true;
				else $rootScope.isNextEnabled = false;

				$rootScope.$apply();
			}
		};

		// ===========================================================================
		// Si se a decidido usar la prioridad
		// ===========================================================================
		if(self.priority){

			$rootScope.beforeGoNext = function () {
				// Si el número de elementos es mayor al número de respuestas requeridas: ÉXITO!!!
				if(self.target().length >= opt.minRightAnswers){

					if (typeof opt.successCallback !== "undefined") opt.successCallback();
					self.success(true);
					return true; 

				} else {

					self.failure(true);
					return false; 

				}
			};

		}

	};

	/**
	 * Inicializa la instancia del ViewModel creado con oneGroupActivity.create
	 *
	 * @param {object} instance Intancia del VM de knockout
	 */
	twoGroupActivity.run = function (instance) {
		ko.cleanNode($('#main-container')[0]);
		ko.bindingHandlers.sortable.beforeMove = instance.verifyAnswer;
		ko.applyBindings(instance, $('#main-container')[0]);
	};

	return twoGroupActivity;

});

lizTwoGroup.directive('twoGroup', function  (twoGroupActivity) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			audio: '@',
			description: '@',
			title: '@'
		},
		templateUrl: '../views/activities/two_group.html',
		link: function postLink(scope, element, attrs) {
			// Añadimos el audio a options
			scope.options.audio = typeof scope.audio !== "undefined" ? scope.audio : false;

			twoGroupActivity.run(twoGroupActivity.create(scope.options));
		}
	}; 
});


var lizWriteTrueFalse = angular.module('lizWriteTrueFalse', []);

lizWriteTrueFalse.directive('writeTrueFalse', function ($sce) {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      audio: '@',
      title: '@',
      description: '@'
    },
    templateUrl: '../views/activities/write_true_false.html',
    link: function (scope, element, attrs) {
      var opt = scope.options,
        rightAnswers = 0,
        minRightAnswers = opt.hasOwnProperty('minRightAnswers') ? opt.minRightAnswers : opt.items.length;
        scope.src = opt.src ? opt.src : false;
        scope.alt = opt.alt ? opt.alt : false;
        scope.bigImg = opt.hasOwnProperty('bigImg') ? opt.bigImg : false;

      scope.rightAnswers = false;
      scope.wrongAnswer = false;
      scope.success = false;
      scope.failure = false;

      scope.showFeedback = false; // Realimentación
      scope.feedback = opt.feedback;

      scope.items = opt.items;

      scope.$root.beforeGoNext = function () {
        if (rightAnswers >= minRightAnswers) {
          scope.success = true;
          return true;
        } else {
          scope.failure = true;
          return true;
        }
      };

      // Permite el uso de html
      scope.sanitize = function (item) {
        return $sce.trustAsHtml(item);
      }

      /**
       * abre el zoom 
       */
      scope.zoom = function () {
        if(scope.bigImg){
          scope.showBig = true;
        }
      };

      /**
       * Cierra el zoom 
       */
      scope.complete = function () {
        
          scope.showBig = false;
      };


      /**
       * Función de verificación
       *
       * @returns {boolean}
       */
      scope.verify = function (item) {
        item.input = item.input.toUpperCase();

        if (item.input === item.answer) {
          scope.rightAnswer = Math.random();
          rightAnswers += 1;
        } else {
          scope.wrongAnswer = Math.random();
        }

        item.completed = true;

        // Contamos los elementos completados
        var completedItems = scope.items.filter(function (item) {
          return item.completed;
        }).length;

        if (completedItems === scope.items.length) {
          scope.$root.isNextEnabled = true;
          scope.showFeedback = true;
        }
      };

    }
  };
});

var lizAnimationBase = angular.module('lizAnimationBase', []);

lizAnimationBase.directive('animationBase', function () { 
	
	return {
		restrict: 'E',
		templateUrl: '../views/animations/animation_base.html',
		transclude: true,
		scope: {
			title: '@',
			instruction: '@',
			description: '@',
			animationId: '@',
			time: '='
		},
		link: function (scope, element, attrs){

			var intervalTime = 0, // Variable que almacena los milisegundos para cada uno de los pasos
				timer = {}; // Contenedor de los timeout

			scope.isBottom = scope.title || scope.description;
			scope.animationClass = ''; // Elemento para el manejo de las clases
			scope.isRunning = false; // Variable para ver si la aplicación está corriendo
			
			/**
			 * Corre la animación 
			 */
			scope.run = function () {

				// no permitir que la animación corra nuevamente
				if(scope.isRunning) return;

				// Reiniciamos los valores
				scope.animationClass = ''; 
				intervalTime = 0;

				scope.isRunning = true; // Animación Corriendo

				// Definimos los pasos en base a los tiempos definidos
				scope.time.forEach(function (time, index) {

					// Actualizamos la clase con cada nuevo paso
					setTimeout(function() {
						scope.animationClass += ' step-' + (index + 1);
						console.log(intervalTime);
						scope.$apply();
					}, intervalTime += time * 1000);

				});

				setTimeout(function() {
					scope.isRunning = false; // Reactivamos la posibilidad de hacer la animación
					scope.$root.isNextEnabled = true; // Activamos la siguiente ruta
					scope.$apply();
				}, intervalTime);

			};

		}
	};

});

/**
* La actividad permite ver una animación tomando un video corto como fuente.
*/
var lizAnimationVideo = angular.module('lizAnimationVideo', []);

lizAnimationVideo.directive('animationVideo', function () {
	return {
		restrict: 'E',
		templateUrl: '../views/animations/animation_video.html',
		scope: {
			options: '=',
			instruction: '@',
			title: '@',
			description: '@',
			audio: '@'
		},
		link: function (scope, iElement, iAttrs) {


			scope.complete = true; // Cuando termina la actividad
			scope.block = false;
			scope.ended = false;
			scope.startButton = false;

			// watch if the activity is finished
			scope.$watch('complete', function(complete) {
				if (complete) {
					scope.$root.isNextEnabled = true;
				} 
			});

			scope.item = scope.options;

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;

			scope.animationEnded = function () {
				scope.$root.isNextEnabled = true;
				console.log("Asd");
			};
		}
	};
});
var lizBoxAnimationFigure = angular.module('lizBoxAnimationFigure', []);

lizBoxAnimationFigure.directive('boxAnimationFigure', function () {
	return {
		restrict: 'E',
		templateUrl: '../views/concepts/box_animation_figure.html',
		transclude: true,
		scope: {
			title: '@',
			description: '@',
			instruction: '@',
			audio: '@',
			arrow: '=',
			addicon: '@',
      		mouse: '='
		}
	};
});

var lizBubbleDescription = angular.module('lizBubbleDescription', []);

lizBubbleDescription.directive('bubbleDescription', function () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			title: '@',
			description: '@',
			audio:'@',
			instruction: '@'
		},
		templateUrl: '../views/concepts/bubble_description.html',
		link: function (scope, iElement, iAttrs) {
			scope.items = scope.options.items;
			completedItems = 0;

			angular.forEach(scope.items, function (item) {
				item.hoverBubble = false
			});

			scope.onHoverBubble = function (item) {
				item.hoverBubble = true;
			};

			scope.onLeaveBubble = function (item) {
				item.hoverBubble = false;
				completedItems++;

				if(completedItems === scope.items.length){
					scope.$root.isNextEnabled = true;
				}
			}	
		}
	};
});
/**
 * La actividad consiste en varios botones que al ser presionados activan una burbuja
 * con contenido.
 */
var lizButtonBubbleDescription = angular.module('lizButtonBubbleDescription', []);

lizButtonBubbleDescription.directive('buttonBubbleDescription', function () {
  // Runs during compile
  return {
    // name: '',
    // priority: 1,
    // terminal: true,
    scope: {
      options: '=',
      title: '@',
      description: '@',
      audio: '@',
      instruction: '@',
      mainimg: '@',
      alt: '@'
    }, // {} = isolate, true = child, false/undefined = no change
    // controller: function($scope, $element, $attrs, $transclude) {},
    // require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
    restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
    // template: '',
    templateUrl: '../views/concepts/button_bubble_description.html',
    // replace: true,
    // transclude: true,
    // compile: function(tElement, tAttrs, function transclude(function(scope, cloneLinkingFn){ return function linking(scope, elm, attrs){}})),
    link: function (scope, iElm, iAttrs) {

      scope.bubbles = scope.options.bubbles;
      scope.complete = false; // Cuando termina la actividad

      // watch if the activity is finished
      scope.$watch('complete', function (complete) {
        if (scope.complete) {

          // Activamos la siguiente actividad o ruta
          scope.$root.isNextEnabled = true;
        }
      });

      scope.makeId = function (id) {
        var newId = id.replace(" ", "_");
        var text = newId + "_";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 5; i++) {
          text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return text;
      };

      angular.forEach(scope.bubbles, function (value, key) {
        value.btnId = scope.makeId(value.name);
        value.audioId = scope.makeId(value.audio);
        value.btnChecked = false;
        value.displayInfo = false;
        value.activeBtn = false;
      });

      // Si la descripción o el título están, entonces la instrucción va al fondo
      scope.isBottom = scope.title || scope.description;

      var counter = 0;

      scope.activateBubble = function (bubble) {

        angular.forEach(scope.bubbles, function (value, key) {
          value.displayInfo = false;
          if (value.btnId != bubble.btnId) {
            value.activeBtn = false;
          }
        });

        bubble.activeBtn = true;
        bubble.displayInfo = true;

        if (bubble.btnChecked === false) {
          counter++;
          bubble.btnChecked = true;
        }
        if (counter === scope.bubbles.length) {
          scope.complete = true;
        }
      };
    }
  };
});
var lizChangeStyleClick = angular.module('lizChangeStyleClick', []);

lizChangeStyleClick.directive('changeStyleClick', function () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			title: '@',
			description: '@',
			audio:'@',
			instruction: '@',
			titleBlock: '@',
			bgimg: '@',
			mainimg: '@'
		},
		templateUrl: '../views/concepts/change_style_click.html',
		link: function (scope, element, attrs) {

			var opt = scope.options,
				completedItems = 0;

			scope.items = opt.items;
			scope.selectedItem = false; // elemento seleccionado
			scope.selectedItem2 = false; // elemento seleccionado
			scope.selectedItemAux = false; // elemento seleccionado
			rightAnswers = 0, // Contador de preguntas buenas
			chances = 0, // Contador de oportunidades de seleccion
			scope.limit = (opt.items.length - Math.floor(opt.items.length/2));

			
			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {
				scope.selectedItem = item; // seleccionamos el objeto
			};

			/**
			 * Selecciona el objetivo indicado
			 */
			scope.selectItem2 = function (item) {
			if(item.isCompleted === true || scope.selectedItem === false ) return;

				scope.selectedItemAux = item; // seleccionamos el objeto

				if (scope.selectedItem === scope.selectedItemAux){
						scope.selectedItem2 = item;
						item.right = true;

					// Contamos los elementos completos
					if(!item.hasOwnProperty('isCompleted')){
						item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
						completedItems++;
						rightAnswers++
					}
				}else{
					scope.selectedItem.wrong = true;
					// Contamos los elementos completos
					if(!item.hasOwnProperty('isCompleted')){
						
						completedItems++;
						scope.selectedItem = false; // elemento seleccionado
						scope.selectedItem2 = false; // elemento seleccionado
						scope.selectedItemAux = false; // elemento seleccionado
					}
				}

				// Fin de la actividad
				if(completedItems === scope.items.length){

					if (rightAnswers >= scope.limit){
						scope.$root.isNextEnabled = true;
							scope.success = true;
						} else {
							scope.failure = true;
						}
				}

				
			};


			/**
			 * Devuelve los estilos personalizados de los items
			 */
			scope.getItemStyles = function (style) {
				var styles = "";
				styles += style;
				return styles;
			};


			/**
			 * Devuelve los estilos del item seleccionado
			 */
			scope.getItemStyles2 = function (item) {
				if(scope.selectedItem2 !== item) return;
				return item.style2;
			};

		}
	}; 
});

lizChangeStyleClick.filter('startFrom', function() {
    return function(input, start) {
        start = +start; //parse to int
        return input.slice(start);
    }
});

lizChangeStyleClick.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
  };
});
var lizChangeStyleSelect = angular.module('lizChangeStyleSelect', []);

lizChangeStyleSelect.directive('changeStyleSelect', function () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			title: '@',
			description: '@',
			audio:'@',
			instruction: '@',
			titleBlock: '@',
			bgimg: '@',
			mainimg: '@'
		},
		templateUrl: '../views/concepts/change_style_select.html',
		link: function (scope, element, attrs) {

			var opt = scope.options,
				completedItems = 0;

			scope.items = opt.items;
			scope.selectedItem = false; // elemento seleccionado
			scope.limit = (opt.items.length - Math.floor(opt.items.length/2));

			
			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {

				scope.selectedItem = item; // seleccionamos el objeto

				// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === scope.items.length){
					scope.$root.isNextEnabled = true;
				}

				
			};

			/**
			 * Devuelve los estilos personalizados de los items
			 */
			scope.getItemStyles = function (style) {
				var styles = "";
				styles += style;
				return styles;
			};


			/**
			 * Devuelve los estilos del item seleccionado
			 */
			scope.getItemStyles2 = function (item) {
				if(scope.selectedItem !== item) return;
				return item.style2;
			};

		}
	}; 
});

lizChangeStyleSelect.filter('startFrom', function() {
    return function(input, start) {
        start = +start; //parse to int
        return input.slice(start);
    }
});
var lizClickImages = angular.module('lizClickImages', []);

lizClickImages.directive('clickImages', function () {
	return {
		restrict: 'E',
		templateUrl: '../views/concepts/click_images.html',
		scope: {
			options: "=",
			img: '@', // Imagen al lado de click images
			alt: '@',
			title: '@',
			watch: '@',
			instruction: '@',
			description: '@',
			itemsPerRow: '@',
			priority: '@',
			audio:'@'
		},
		controller: function ($scope, $sce) {
			$scope.items = $scope.options; 

			// Recorremos los elementos para definir el audio
			$scope.items.forEach(function(item){
				item.audio = item.hasOwnProperty('audio') ? item.audio : item.resource;
				item.type = item.hasOwnProperty('type') ? item.type : 'png'; // Tipo de recurso
			});

			// Si la descripción o el título están, entonces la instrucción va al fondo
			$scope.isBottom = $scope.title || $scope.description;

			// Para usar el html en angular
			$scope.sanitize = function (item) {
				return $sce.trustAsHtml(item);
			}

			// Verifica el final de la actividad, según el número de imágenes 
			// Para ello, manejamos un contador. Cada vez que se da click en una imagen,
			// se le agrega una propiedad con el fin de que se cuente una sola vez.
			// Cuando el contador es igual al número de imágenes, se termina la actividad
			$scope.verify = function (item) {
				if(typeof $scope.completeCounter === "undefined")
					$scope.completeCounter = 0;

				if(typeof item.clicked === "undefined"){
					item.clicked = true;
					$scope.completeCounter++;

					if($scope.completeCounter === $scope.options.length) {
						$scope.$root.isNextEnabled = true; // Activamos el botón de siguiente
					}
				}
			};

			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			$scope.getStyles = function function_name(argument) {
				var styles = "";

				if($scope.itemsPerRow){
					styles += "width: " + (100 / $scope.itemsPerRow) + "%;";
				} else {
					styles += "width: " + (100 / $scope.options.length) + "%;";
				}
				
				return styles;
			}

			// En caso de prioridad, se activa el siguiente vínculo
			if($scope.priority){
				$scope.$root.isNextEnabled = true;
			}

		}
	};
});

var lizClickTransition = angular.module('lizClickTransition', []);

lizClickTransition.directive('clickTransition', function () {
	return {
		restrict: 'E',
		templateUrl: '../views/concepts/click_transition.html',
		scope: {
			options: "=",
			title: '@',
			instruction: '@',
			description: '@'
		},
		controller: function ($scope, $sce) {
			// Si la descripción o el título están, entonces la instrucción va al fondo
			$scope.isBottom = $scope.title || $scope.description;

			// Para usar el html en angular
			$scope.sanitize = function (item) {
				return $sce.trustAsHtml(item);
			}

			// Verifica el final de la actividad, según el número de imágenes 
			// Para ello, manejamos un contador. Cada vez que se da click en una imagen,
			// se le agrega una propiedad con el fin de que se cuente una sola vez.
			// Cuando el contador es igual al número de imágenes, se termina la actividad
			$scope.verify = function (item) {
				if(typeof $scope.completeCounter === "undefined")
					$scope.completeCounter = 0;

				if(typeof item.clicked === "undefined"){
					item.clicked = true;
					$scope.completeCounter++;

					if($scope.completeCounter === $scope.options.length) {
						$scope.$root.isNextEnabled = true; // Activamos el botón de siguiente
					}
				}
			};
		}
	};
});

var lizCompetences = angular.module('lizCompetences', []);

lizCompetences.directive('competencesNew', function () {
	return {
		restrict: 'E',
		templateUrl: '../views/concepts/competences.html',
		scope: {
			options: "="			
		},
		link: function (scope) {
			scope.$root.isNextEnabled = true;
		}		
	};
});

var lizConceptsTable = angular.module('lizConceptsTable', []);

lizConceptsTable.directive('conceptsTable', function  () {
    return {
        restrict: 'E',
        templateUrl: '../views/concepts/concepts_table.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			title:'@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.itemsPerRow = scope.options.itemsPerRow;
			scope.rowsstyle = scope.options.rowsstyle;
			scope.mainimg = scope.options.mainimg;
			scope.alt = scope.options.alt;
			scope.words = [];
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			scope.$root.isNextEnabled = true;

			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getStyles = function function_name(argument) {
				var styles = "";

				if(scope.itemsPerRow){
					styles += "width: " + (100 / scope.itemsPerRow) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-right: " + (10 / scope.itemsPerRow) + "%!important;";
				} else {
					styles += "width: " + (100 / scope.items.length) + "%;";
					styles += "margin-left: " + (10 / scope.itemsPerRow) + "%;";
					styles += "margin-top: " + (10 / scope.itemsPerRow) + "%;";
				}
				
				return styles;

				
			};


		}


    }; 
});


/**
 * Created by Maria Giraldo
 */
var lizCorrectWordInSentence = angular.module('lizCorrectWordInSentence', []);

lizCorrectWordInSentence.directive('correctWordInSentence', function ($sce, $log) {
    return {
        restrict: 'E',
        scope: {
            options: '=',
            title: '@',
            description: '@',
            audio:'@',
            instruction: '@'
        },
        templateUrl: '../views/concepts/correct_word_in_sentence.html',
        link: function (scope, iElement, iAttrs) {

            var opt = scope.options,
                rightAnswers = 0;

            // variables básicas de la acividad de angular
            scope.rightAnswer = false;
            scope.wrongAnswer = false;
            scope.success = false;
            scope.failure = false;
            scope.$root.isNextEnabled = true;
            scope.imgwidth = (opt.imgwidth) ? opt.imgwidth : 60;
            scope.chancesPerItem = (opt.chancesPerItem) ? opt.chancesPerItem : 2;
            scope.minRightAnwers = opt.minRightAnwers;
            scope.randomItems = (scope.options.randomItems) ? true:false;
            scope.$root.isNextEnabled = false;


            // Preguntas
            scope.questions = opt.questions;

            //Numero de opciones por frase
            angular.forEach(opt, function (value, key) {
                angular.forEach(value.questions, function (v, k) {
                    v.chances = scope.chancesPerItem;
                    v.completed = false;  //Initialize
                })
            })

            /**
             * Verifica la respuesta.
             * item: iem actual: frase actual
             * text: palabra seleccionada
             * n: pocision del item, sirve para concatenar el Id del elemento
             * i: pocision de cada palabra deltro del item,  sirve para concatenar el Id del elemento
             */
            scope.verify = function (item, text, n, i) {
                item.chances -= 1;  //Resta opciones de clic

                // Si tiene opciones de clic
                if (item.chances >=0 ){
                    //Validar respuesta correcta
                    if (text === item.answer){
                        item.wrong = false;
                        item.right = true;
                        rightAnswers += 1;
                        item.completed = true;
                        item.ok = true;

                        // Destaca respuesta correcta
                        var element = "#"+n+i;
                        $(element).addClass("answer_ok");
                    }
                    else
                    {
                        //Evita mostrar la X si se ha acertado anteriormente
                        if (!item.completed)    item.wrong = true;
                    }
                    //No tiene opciones de clic
                    if(item.chances === 0)item.ok = true;
                }
                else{
                    item.ok = true;
                }


                //Contamos los elementos completados por item
                var completed =  scope.options[0].questions.filter(function (q) {
                    return q.ok;
                }).length;

                // Contamos los elementos terminados
                var completedItems =  scope.options[0].questions.filter(function (q) {
                    return q.completed;
                }).length;

                // Se ha intentado en todos los items
                if (completed ===  scope.options[0].questions.length) {
                    //Se ha acertado en el minimo requerido
                    if(completedItems >= scope.options[0].minRightAnwers) {
                        scope.$root.isNextEnabled = true;
                        //Hábilita mensaje de felicitaciones
                        scope.success = true;
                    }
                    else{
                        //Habilita mensaje para volver a intentar
                        scope.failure = true;
                    }
                }
                else{
                    return;
                }
            }

            // Permite el uso de html
            scope.sanitize = function (phrase) {
                return $sce.trustAsHtml(phrase);
            };

        }
    };
});
var lizHoverShowText = angular.module('lizHoverShowText', []);

lizHoverShowText.directive('hoverShowText', function  ($sce) {
    return {
        restrict: 'E',
        templateUrl: '../views/concepts/hover_show_text.html',
		scope: {
			options: '=',
			description: '@',
			titlehead: '@',
			instruction: '@',
			audio:'@'
			
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.items = scope.options.items;
			scope.canvas = scope.options.canvas; // La imagen principal
			scope.altcanvas = scope.options.altcanvas; // texto alternativo de La imagen principal
			scope.titlecanvas = scope.options.titlecanvas; // titulo de La imagen principal
			scope.imgStyle = scope.options.imgStyle; // estilos de La imagen principal
			scope.success = false;
			scope.event = scope.options.eventClick ? 'click' : 'mouseover';
			scope.block = false;
			completedItems = 0;
			scope.hidetext = scope.options.hidetext//activar para ocultar el popover cuando termina el evento
			scope.mainText = scope.options.mainText//agrga texto html ala actividad

			console.log(scope.mainText);

			/**
			 * Marca los elementos y verifica el final
			 */
			scope.verify = function (item) {
				if(item.completed) return;

				item.completed = true;

				var countCompleted = scope.items.filter(function(item){
					return item.completed;
				}).length;

				if(countCompleted === scope.items.length) {
					scope.$root.isNextEnabled = true; // Activa la flecha de siguiente
				}
			};

			// Para usar el html en angular
			scope.sanitize = function (item) {
				return $sce.trustAsHtml(item);
			}

			/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			scope.getTargetsStyles = function (item) {
				var styles = '';

				styles += 'width: ' + item.w + 'px;';
				styles += 'height: ' + item.h + 'px;';
				styles += 'top: ' + item.t + '%;';
				styles += 'left: ' + item.l + '%;';

				// estilos personalizados
					if(scope.options.hasOwnProperty('customStyles')) styles += scope.options.customStyles;

				return styles;
			};

		}
	}; 
});

lizHoverShowText.directive('popover', function($timeout){
	return {
	    restrict: 'A',
			scope: {
				item: '=',
				popoverText: '@',
				popoverPlacement: '@',
				popoverTitle: '@',
				popoverEvent:'@',
				hidetext: '@',

			},
	    link : function (scope, element, attrs) {
				var disable = false;

				$timeout(function(){
					$(element).popover({
						animation: true,
						placement: scope.popoverPlacement,
						title: scope.popoverTitle,
						trigger: 'manual',
						html: true,
						content: scope.popoverText//container: 'body'
					});
				});
				
				if(scope.hidetext){
					element.bind('mouseleave', function (e) {
						
						$(element).popover('hide');
					});

					element.bind(scope.popoverEvent, function (e) {
						
						$(element).popover('show');

					});
				};

					element.bind(scope.popoverEvent, function (e) {
						if(disable) return; // Solo se anima la primera vez
						
						$(element).popover('show');
						disable = true;
					});

    	}
	};
});




var lizImageMapDescription = angular.module('lizImageMapDescription', []);

lizImageMapDescription.directive('imageMapDescription', function ($sce) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			title: '@',
			description: '@',
			audio:'@',
			instruction: '@',
			mainimg: '@'
		},
		templateUrl: '../views/concepts/image_map_description.html',
		link: function (scope, element, attrs) {
			var opt = scope.options,
				completedItems = 0;

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;

			scope.canvas = opt.canvas;
			scope.canvasAlt = opt.canvasAlt;
			scope.items = opt.items;
			scope.selectedItem = false; // elemento seleccionado

			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {
				scope.selectedItem = item; // seleccionamos el objeto

				// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === scope.items.length){
					scope.$root.isNextEnabled = true;
				}
			};


			/**
			 * Devuelve los estilos de cada elemento
			 */
			scope.getStyles = function (item) {
				var styles = '';

				styles += "top: " + item.t + "%;";
				styles += "left: " + item.l + "%;";	
				return styles;
			};


      /**
       * Sanitizes the value as html
       * @param value
       * @returns String converted string
       */
      scope.sanitize = function (value) {
        return $sce.trustAsHtml(value);
      };



		}
	}; 
});


var lizImageMapMat = angular.module('lizImageMapMat', []);

lizImageMapMat.directive('imageMapMat', function ($sce) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			title: '@',
			description: '@',
			audio:'@',
			instruction: '@',
			mainimg: '@'
		},
		templateUrl: '../views/concepts/image_map_mat.html',
		link: function (scope, element, attrs) {
			var opt = scope.options,
				completedItems = 0;

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;

			scope.canvas = opt.canvas;
			scope.canvasAlt = opt.canvasAlt;
			scope.items = opt.items;
			scope.selectedItem = false; // elemento seleccionado

			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {
				scope.selectedItem = item; // seleccionamos el objeto

				// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === scope.items.length){
					scope.$root.isNextEnabled = true;
				}
			};


			/**
			 * Devuelve los estilos de cada elemento
			 */
			scope.getStyles = function (item) {
				var styles = '';

				styles += "top: " + item.t + "%;";
				styles += "left: " + item.l + "%;";	
				return styles;
			};


      /**
       * Sanitizes the value as html
       * @param value
       * @returns String converted string
       */
      scope.sanitize = function (value) {
        return $sce.trustAsHtml(value);
      };



		}
	}; 
});


var lizImageSound = angular.module('lizImageSound', []);

lizImageSound.directive('imageSound', function () {
	return {
		restrict: 'E',
		scope: {
			options: '='
		},
		templateUrl: '../views/concepts/image_sound.html',
		link: function (scope, element, attrs) {

			var opt = scope.options,
				completedItems = 0;

            if (opt.hasOwnProperty('multiple')) {
                opt.multiple = false;
            }

			scope.canvas = opt.canvas;
			scope.canvasAlt = opt.canvasAlt;
			scope.items = opt.items;

			scope.makeId = function (id) {
				var newId = id.replace(" ", "_");
                var text = newId + "_";
                var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

                for (var i = 0; i < 5; i++) {
                    text += possible.charAt(Math.floor(Math.random() * possible.length));
				}

                return text;
            };

			angular.forEach(scope.items, function (value, key) {
				value.id = scope.makeId(value.button);
			});

			/**
			 * Selecciona el elemento indicado
			 */
			/*scope.selectItem = function (item) {
				scope.selectedItem = item; // seleccionamos el objeto

				// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === scope.items.length){
					if (opt.multiple === false) {
                        scope.$root.isNextEnabled = true;
                    }
				}
			};*/

			/**
			 * Devuelve los estilos de cada elemento
			 */
			scope.getStyles = function (item) {
				var styles = '';

				styles += "top: " + item.t + "%;";
				styles += "left: " + item.l + "%;";
				
				return styles;
			};


		}
	}; 
});


var lizImagesAndText = angular.module('lizImagesAndText', []);

lizImagesAndText.directive('imagesAndText', function ($sce) {
  return {
    restrict: 'E',
    templateUrl: '../views/concepts/images_and_text.html',
    scope: {
      options: "=",
      title: '@',
      description: '@',
      audio: '@',
      noafter: '@',
      maintext: '@',
      itemswidth:'@',
      addicon: '@',
      ext: '@'
    },

    link: function (scope) {
      scope.$root.isNextEnabled = true;
      
      scope.ext = scope.ext ? scope.ext : '.png';

      // Para usar el html en angular
      scope.sanitize = function (item) {

        return $sce.trustAsHtml(item);
      }

    }
  };
});

/**
 * Muestra bloques de imagenes con o sin audio ejecutados
 * por los bloques.
 */
 var lizImagesBlockDescription = angular.module('lizImagesBlockDescription', []);

 lizImagesBlockDescription.directive('imagesBlockDescription', function ($sce){
 	// Runs during compile
 	return {
 		// name: '',
 		// priority: 1,
 		// terminal: true,
 		scope: {
 			options: "=",
 			title: "@",
      		description: '@',
      		instruction: '@',
      		audio: '@'
 		}, // {} = isolate, true = child, false/undefined = no change
 		// controller: function($$scope, $element, $attrs, $transclude) {},
 		// require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
 		restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
 		// template: '',
 		templateUrl: '../views/concepts/images_block_description.html',
 		// replace: true,
 		// transclude: true,
 		// compile: function(tElement, tAttrs, function transclude(function($scope, cloneLinkingFn){ return function linking($scope, elm, attrs){}})),
 		link: function($scope) {

 			if (false === $scope.options.hasAudio) {
 				$scope.$root.isNextEnabled = true;
 			}

 			$scope.hasZoomImage = $scope.options.hasZoomImage || false;
 			$scope.blocks = $scope.options.blocks;
 			$scope.customClass = ($scope.options.customClass) ? $scope.options.customClass : "";
 			$scope.complete = false; // Cuando termina la actividad
      		$scope.hideDescription = $scope.options.hideDescription;
      		$scope.itemsPerRow = $scope.options.itemsPerRow;
      		// Si la descripción o el título están, entonces la instrucción va al fondo
      		$scope.isBottom = $scope.title || $scope.description;

      		$scope.$watch('complete', function (complete) {
		        if (complete) {
		          	$scope.$root.isNextEnabled = true;
		        }
	      	});

	      	$scope.sanitize = function (item) {
	      		console.log(item);
				return $sce.trustAsHtml(item);
			}

	      	/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			$scope.getStyles = function () {
				var styles = "";

				if($scope.itemsPerRow){
					styles += "width: " + (100 / $scope.itemsPerRow) + "%;";
				} else {
					styles += "width: " + (100 / $scope.blocks.length) + "%;";
				}
				
				return styles;
			}

	      	var counter = 0;

	      	$scope.verify = function (block) {
	      		counter++;

	      		if (counter === $scope.options.blocks.length) {
	      			$scope.complete = true;
	      		}
	      	}
 		}
 	};
 });
/**
 * Muestra bloques de imagenes con o sin audio ejecutados
 * por los bloques.
 */
 var lizImagesBlockMat = angular.module('lizImagesBlockMat', []);

 lizImagesBlockMat.directive('imagesBlockMat', function ($sce){
 	// Runs during compile
 	return {
 		// name: '',
 		// priority: 1,
 		// terminal: true,
 		scope: {
 			options: "=",
 			title: "@",
      		description: '@',
      		instruction: '@',
      		audio: '@'
 		}, // {} = isolate, true = child, false/undefined = no change
 		// controller: function($$scope, $element, $attrs, $transclude) {},
 		// require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
 		restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
 		// template: '',
 		templateUrl: '../views/concepts/images_block_mat.html',
 		// replace: true,
 		// transclude: true,
 		// compile: function(tElement, tAttrs, function transclude(function($scope, cloneLinkingFn){ return function linking($scope, elm, attrs){}})),
 		link: function($scope) {

 			if (false === $scope.options.hasAudio) {
 				$scope.$root.isNextEnabled = true;
 			}

 			$scope.hasZoomImage = $scope.options.hasZoomImage || false;
 			$scope.blocks = $scope.options.blocks;
 			$scope.customClass = ($scope.options.customClass) ? $scope.options.customClass : "";
 			$scope.complete = false; // Cuando termina la actividad
      		$scope.hideDescription = $scope.options.hideDescription;
      		$scope.itemsPerRow = $scope.options.itemsPerRow;
      		// Si la descripción o el título están, entonces la instrucción va al fondo
      		$scope.isBottom = $scope.title || $scope.description;

      		$scope.$watch('complete', function (complete) {
		        if (complete) {
		          	$scope.$root.isNextEnabled = true;
		        }
	      	});

	      	$scope.sanitize = function (item) {
	      		console.log(item);
				return $sce.trustAsHtml(item);
			}

	      	/**
			 * Para obtener los estilos de los elementos, específicamente el ancho
			 */
			$scope.getStyles = function () {
				var styles = "";

				if($scope.itemsPerRow){
					styles += "width: " + (180 / $scope.itemsPerRow) + "%;";
				} else {
					styles += "width: " + (180 / $scope.blocks.length) + "%;";
				}
				
				return styles;
			}

	      	var counter = 0;

	      	$scope.verify = function (block) {
	      		counter++;

	      		if (counter === $scope.options.blocks.length) {
	      			$scope.complete = true;
	      		}
	      	}
 		}
 	};
 });
var lizImagesInfo = angular.module('lizImagesInfo', []);

lizImagesInfo.directive('imagesInfo', function () {
	return {
		restrict: 'E',
		templateUrl: '../views/concepts/images_info.html',
		scope: {
			options: "=",
      title: '@',
      description: '@',
			instruction: '@',
			audio:'@'
		},
		link: function (scope, element, attrs) {
      var opt = scope.options,
        completedImages = 0; // Contador

      scope.selectedImage = false;
      scope.images = opt.images;
      scope.isBottom = scope.title || scope.description; // Define donde va la instrucción

      scope.images.forEach(function (image) {
        image.imgExt = image.hasOwnProperty('imgExt') ? image.imgExt : 'png'
      });


      /**
       * Verificamos la imagen. Esta función define el fin de la actividad y selecciona la imagen.
       */
      scope.verify = function (image) {
        scope.selectedImage = image;

        if(image.completed) return;

        image.completed = true;
        completedImages += 1;

        if(completedImages === scope.images.length) {
          scope.$root.isNextEnabled = true;
        }
      };

		}
	};
});

var lizLetter1 = angular.module('lizLetter1', []);

lizLetter1.directive('letter1', function () {
	return {
		restrict: 'E',
		templateUrl: '../views/concepts/letter1.html',
		transclude: true,
		scope: {
			letter: "@"
		},
		link: function (scope) {
			scope.activateNext = function () {
				scope.$root.isNextEnabled = true;
			}
		}
	};
});

var lizMultipleImageMapDescription = angular.module('lizMultipleImageMapDescription', []);

lizMultipleImageMapDescription.directive('multipleImageMapDescription', function () {
    return {
        restrict: 'E',
        scope: {
            options: '=',
            title: '@',
            description: '@',
            audio:'@',
            instruction: '@',
            mainimg: '@',
            alt: '@'
        },
        templateUrl: '../views/concepts/multiple_image_map_description.html',
        link: function (scope, element, attr) {
            scope.maps = scope.options.maps;
            completedItems = 0;

            angular.forEach(scope.maps, function (value, key) {
                value.display = false;
                value.data.multiple = true;
                value.checked = false;
            });
            console.log(scope.maps);
            scope.displayOptions = true;
            scope.backEnabled = false;

            // watch if the activity is finished
            scope.$watch('complete', function(complete) {
                if (complete) {

                    // Activamos la siguiente actividad o ruta
                    scope.$root.isNextEnabled = true;
                }
            });

            scope.goBack = function () {
                angular.forEach(scope.maps, function (value, key) {
                    value.display = false;
                });

                scope.displayOptions = true;
                scope.backEnabled = false;

                if (completedItems === scope.maps.length) {
                    scope.complete = true;
                }
            };

            scope.selectMap = function (map) {
                scope.displayOptions = false;
                map.display = true;
                scope.title = map.title;
                scope.description = map.description;
                scope.audio = map.audio;
                scope.instruction = map.instruction;
                scope.backEnabled = true;

                if (map.checked === false) {
                    completedItems++;
                    map.checked = true;
                }
            };
        }
    };
});

var lizMultiplesImagesAndText = angular.module('lizMultiplesImagesAndText', []);

lizMultiplesImagesAndText.directive('multiplesImagesAndText', function ($sce) {
  return {
    restrict: 'E',
    templateUrl: '../views/concepts/multiples_images_and_text.html',
    scope: {
      options: "=",
      title: '@',
      description: '@',
      audio: '@',
      noafter: '@',
      addicon: '@'
    },

    link: function (scope) {
      // activamos las opciones
      scope.items = scope.options.items;
      scope.items2 = scope.options.items2;
      scope.itemsPerRow = scope.options.itemsPerRow;
      scope.$root.isNextEnabled = true;


      // Para usar el html en angular
      scope.sanitize = function (item) {
        console.log(item);
        return $sce.trustAsHtml(item);
      }

      console.log(scope.options);

    }
  };
});

var lizShowConcepts = angular.module('lizShowConcepts', []);

lizShowConcepts.directive('showConcepts', function () {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      title: '@',
      description: '@',
      audio: '@',
      instruction: '@'
    },
    templateUrl: '../views/concepts/show_concepts.html',
    link: function (scope, element, attrs) {

      var opt = scope.options,
        completedItems = 0;

      scope.items = opt.items;
      scope.selectedItem = false; // elemento seleccionado

      /**
       * Selecciona el elemento indicado
       */
      scope.selectItem = function (item) {

        scope.selectedItem = item; // seleccionamos el objeto

        // Contamos los elementos completos
        if (!item.hasOwnProperty('isCompleted')) {
          item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
          completedItems++;
        }

        // Fin de la actividad
        if (completedItems === scope.items.length) {
          scope.$root.isNextEnabled = true;
        }
      };

      /**
       * Devuelve los estilos personalizados de los items
       */
      scope.getItemStyles = function () {
        var styles = "";

        styles += "width: " + (100 / scope.items.length) + "%;";

        return styles;
      };

    }
  };
});


var lizShowConceptsCharacter = angular.module('lizShowConceptsCharacter', []);

lizShowConceptsCharacter.directive('showConceptsCharacter', function () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			title: '@',
			description: '@',
			audio:'@',
			instruction: '@',
			alt: '@',
			mainimg: '@'
		},
		templateUrl: '../views/concepts/show_concepts_character.html',
		link: function (scope, element, attrs) {

			var opt = scope.options,
				completedItems = 0;

			scope.videoLink = (opt.videoLink) ? opt.videoLink : false;
			scope.items = opt.items;
			scope.items2 = opt.items2;
			scope.selectedItem = false; // elemento seleccionado

			/**
			 * si no hay elementos que mostrar simplemente se activa el boton adelante
			 */
			if (scope.items.length === 0){
				scope.$root.isNextEnabled = true;
			}

			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {

				scope.selectedItem = item; // seleccionamos el objeto

				// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === (scope.items.length + scope.items2.length) ){
					scope.$root.isNextEnabled = true;
				}
			};

			/**
			 * Devuelve los estilos personalizados de los items
			 */
			scope.getItemStyles = function () {
				var styles = "";

				styles += "width: " + (100 / 1) + "%;";

				return styles;
			};

		}
	}; 
});


var lizShowConceptsCharacters = angular.module('lizShowConceptsCharacters', []);

lizShowConceptsCharacters.directive('showConceptsCharacters', function () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			title: '@',
			description: '@',
			audio:'@',
			instruction: '@',
			alt: '@',
			mainimg: '@'
		},
		templateUrl: '../views/concepts/show_concepts_characters.html',
		link: function (scope, element, attrs) {

			var opt = scope.options,
				completedItems = 0;

			scope.videoLink = (opt.videoLink) ? opt.videoLink : false;
			scope.items = opt.items;
			scope.items2 = opt.items2;
			scope.selectedItem = false; // elemento seleccionado

			/**
			 * si no hay elementos que mostrar simplemente se activa el boton adelante
			 */
			if (scope.items.length === 0){
				scope.$root.isNextEnabled = true;
			}

			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {

				scope.selectedItem = item; // seleccionamos el objeto

				// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === (scope.items.length + scope.items2.length) ){
					scope.$root.isNextEnabled = true;
				}
			};

			/**
			 * Devuelve los estilos personalizados de los items
			 */
			scope.getItemStyles = function () {
				var styles = "";

				styles += "width: " + (100 / 1) + "%;";

				return styles;
			};

		}
	}; 
});


var lizShowConceptsGroupExamples = angular.module('lizShowConceptsGroupExamples', []);

lizShowConceptsGroupExamples.directive('showConceptsGroupExamples', function  ($sce) {
    return {
        restrict: 'E',
        templateUrl: '../views/concepts/show_concepts_group_examples.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			addicon: '@'
		},

		link: function (scope, element, attrs) {
			// Corremos la aplicación
			scope.groups = scope.options.groups;
			scope.items = [];
			minRightAnswers = scope.options.minRightAnswers
			rightAnswers = 0, // Contador de preguntas buenas
			chances = scope.options.chances,
			scope.success = false;
			scope.failure = false;
			scope.block = false;
			scope.customClass = (scope.options.hasOwnProperty("customClass")) ? scope.options.customClass : ""; 
			
			// Recorremos todas las grupos y sus items
			      scope.groups.forEach(function (group) {
			        if(group.items){ group.items.forEach(function (item) {
				          // agregamos cada item a el array de items
				          scope.items.push({
								item: item,								      
						  });

				        });
			        };
			      });
			
			
			scope.$root.isNextEnabled = true; // Activamos el siguiente vínculo
			
		// Para usar el html en angular
		scope.sanitize = function (item) {
			return $sce.trustAsHtml(item);
		}

		}

		


    }; 
});


var lizShowConceptsImages = angular.module('lizShowConceptsImages', []);

lizShowConceptsImages.directive('showConceptsImages', [function () {
	return {
		restrict: 'E',
		templateUrl: '../views/concepts/show_concepts_images.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			instruction: '@',
			mainimg: '@',
			mainalt: '@'
		},
		link: function (scope, iElement, iAttrs) {
			var opt = scope.options,
				completedItems = 0;

			scope.items = opt.items;
			console.log(scope.options);
			scope.selectedItem = false; // elemento seleccionado

			/**
			 * Selecciona el elemento indicado
			 */
			 scope.selectItem = function (item) {
			 	scope.selectedItem = item; // seleccionamos el objeto

			 	// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === scope.items.length){
					scope.$root.isNextEnabled = true;
				}
			 }
		}
	};
}])
;var lizShowConceptsImg = angular.module('lizShowConceptsImg', []);

lizShowConceptsImg.directive('showConceptsImg', [function () {
	return {
		restrict: 'E',
		templateUrl: '../views/concepts/show_concepts_img.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			instruction: '@',
			mainimg: '@',
			mainalt: '@',
			img:'@',
			alt: '@'
		},
		link: function (scope, iElement, iAttrs) {
			var opt = scope.options,
				completedItems = 0;

			scope.items = opt.items;
			console.log(scope.options);
			scope.selectedItem = false; // elemento seleccionado

			/**
			 * Selecciona el elemento indicado
			 */
			 scope.selectItem = function (item) {
			 	scope.selectedItem = item; // seleccionamos el objeto

			 	// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === scope.items.length){
					scope.$root.isNextEnabled = true;
				}
			 }
		}
	};
}])
;var lizShowConceptsText = angular.module('lizShowConceptsText', []);

lizShowConceptsText.directive('showConceptsText', function ($sce) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			titletop: '@',
			titleimg: '@',
			description: '@',
			audio:'@',
			instruction: '@',
			noplay: '@',
			mainimg: '@',
			imgpre: '@',
			imgpreAlt: '@',
			alt:'@',
			itemsperrow: '@'
		},
		templateUrl: '../views/concepts/show_concepts_text.html',
		link: function (scope, element, attrs) {

			var opt = scope.options,
				completedItems = 0;

			scope.items = opt.items;
			scope.examples = opt.items.examples;
			scope.selectedItem = false; // elemento seleccionado
			scope.imgStyle = opt.imgStyle ? opt.imgStyle : '';
			scope.hasImageItems = scope.options.hasImageItems; // si los items son solo imagenes
			scope.itemsperrow2 = scope.itemsperrow ? scope.itemsperrow : 1;

			console.log(scope.itemsperrow);

			// Para usar el html en angular
			scope.sanitize = function (item) {
				return $sce.trustAsHtml(item);
			}

			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {

				scope.selectedItem = item; // seleccionamos el objeto

				// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === scope.items.length){
					scope.$root.isNextEnabled = true;
				}
			};

			/**
			 * Devuelve los estilos personalizados de los items
			 */
			scope.getItemStyles = function (item) {
				var styles = "";


				if(item.hasOwnProperty('title') || scope.mainimg === undefined){


					styles += "width: " + (100 /scope.itemsperrow2) + "%;";
				}

				return styles;	
			};

			/**
			 * Devuelve los estilos personalizados de los items
			 */
			scope.getItemStyles2 = function () {
				var styles = scope.imgStyle;

				return styles;
			};

		}
	}; 
});


var lizShowdescription = angular.module('lizShowdescription', []);

lizShowdescription.directive('showDescription', function () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			title: '@',
			description: '@'
		},
		templateUrl: '../views/concepts/show_description.html',
		link: function (scope, element, attrs) {

			var opt = scope.options,
				completedItems = 0; // Contador usado para definir el fin de la actividad

			scope.canvas = opt.canvas;
			scope.audio = opt.audio;
			scope.instruction = opt.instruction;
			scope.alt = opt.alt;
			scope.items = opt.items;
			scope.selectedItem = false; // Elemento actual

			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {

				scope.selectedItem = item;

				// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === scope.items.length){
					scope.$root.isNextEnabled = true;
				}

			};

			/**
			 * Devuelve los estilos del item-title
			 */
			scope.getItemTitleStyles = function (item) {
				return "width: " + item.position.w + "em;" +
					"top: " + item.position.t + "em;" +
					"left: " + item.position.l + "em;"; 
			};
			

		}
	}; 
});

var lizShowDescriptionImagesSound = angular.module('lizShowDescriptionImagesSound', []);

lizShowDescriptionImagesSound.directive('showDescriptionImagesSound', [function () {
	return {
		restrict: 'E',
		templateUrl: '../views/concepts/show_description_images_sound.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			instruction: '@',
			mainimg: '@',
			mainalt: '@'
		},
		link: function (scope, iElement, iAttrs) {
			var opt = scope.options,
				completedItems = 0;

			scope.items = opt.items;
			console.log(scope.options);
			scope.selectedItem = false; // elemento seleccionado

			/**
			 * Selecciona el elemento indicado
			 */
			 scope.selectItem = function (item) {
			 	scope.selectedItem = item; // seleccionamos el objeto

			 	// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === scope.items.length){
					scope.$root.isNextEnabled = true;
				}
			 }
		}
	};
}])
;var lizShowHoverWords = angular.module('lizShowHoverWords', []);

lizShowHoverWords.directive('showHoverWords', function () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			title: '@',
			description: '@',
			audio:'@',
			instruction: '@'
		},
		templateUrl: '../views/concepts/show_hover_words.html',
		link: function (scope, iElement, iAttrs) {
			scope.items = scope.options.items;
			scope.$root.isNextEnabled = true;

			angular.forEach(scope.items, function (value, key) {
				var	words = value.text.split(" "),
					mainWords = value.mainWord.toLowerCase().split(" ");
				value.words = [];

				if (mainWords.length > 1) {
					for (var i = 0; i < words.length; i++) {
						if (mainWords.indexOf(words[i].toLowerCase()) > -1) {
							value.words.push({
								main: true,
								title: value.mainTitle,
								word: words[i]
							});
						} else {
							value.words.push({
								main: false,
								title: "",
								word: words[i]
							});
						}
					}
				} else {
					for (var i = 0; i < words.length; i++) {
						if (words[i].toLowerCase() === value.mainWord.toLowerCase()) {
							value.words.push({
								main: true,
								title: value.mainTitle,
								word: words[i]
							});
						} else {
							value.words.push({
								main: false,
								title: "",
								word: words[i]
							});
						}
					}
				}
			});

			/**
		      * Devuelve los estilos del texto.
		      */
	      	scope.getTextStyles = function () {
	      		
	        	var styles = "";

	        	if(! scope.items[0].resource) {
        		  styles = "margin-left: 0; width: 100%;";
	        	}

	        	return styles;
	      	};

	      	scope.onWordReady = function () {
      			$("[data-toggle='tooltip']").tooltip();
	      	};	
		}
	};
});
var lizShowImagesBlockDescription = angular.module('lizShowImagesBlockDescription', []);

lizShowImagesBlockDescription.directive('showImagesBlockDescription', [function () {
	return {
		restrict: 'E',
		templateUrl: '../views/concepts/show_images_block_description.html',
		scope: {
			options: '=',
			description: '@',
			audio:'@',
			title: '@',
			instruction: '@',
		},
		link: function (scope,iElement,iAttrs,$sce) {
			var opt = scope.options,
				completedBlocks = 0;

			scope.blocks = opt.blocks;
			scope.selectedBlock = false; // elemento seleccionado

			// Para usar el html en angular
			scope.sanitize = function (item) {
				return $sce.trustAsHtml(item);
			}

			/**
			 * Selecciona el elemento indicado
			 */
			 scope.selectBlock = function (block) {
			 	console.log(block);
			 	scope.selectedBlock = block; // seleccionamos el objeto

			 	// Contamos los elementos completos
				if(!block.hasOwnProperty('isCompleted')){
					block.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedBlocks++;
				}

				// Fin de la actividad
				if(completedBlocks === scope.blocks.length){
					scope.$root.isNextEnabled = true;
				}
			 }
		}
	};
}])
;/**
 * Created by mateoquintero on 5/19/14.
 */
var lizShowMultipleHoverPhrase = angular.module('lizShowMultipleHoverPhrase', []);

lizShowMultipleHoverPhrase.directive('showMultipleHoverPhrase', function ($sce, $log) {
    return {
        restrict: 'E',
        scope: {
            options: '=',
            title: '@',
            description: '@',
            audio:'@',
            instruction: '@'
        },
        templateUrl: '../views/concepts/show_multiple_hover_phrase.html',
        link: function (scope, iElement, iAttrs) {
            $log.log(scope);
            scope.$root.isNextEnabled = true;

            // Permite el uso de html
            scope.sanitize = function (phrase) {
                return $sce.trustAsHtml(phrase);
            };
        }
    };
});
var lizShowName = angular.module('lizShowName', []);

lizShowName.directive('showName', function ($sce) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			title: '@',
			description: '@',
			audio:'@',
			instruction: '@',
			mainimg: '@'
		},
		templateUrl: '../views/concepts/show_name.html',
		link: function (scope, element, attrs) {

			var opt = scope.options,
				completedItems = 0;

			scope.items = opt.items;
			scope.selectedItem = false; // elemento seleccionado
			scope.itemsPerRow = opt.itemsPerRow ? opt.itemsPerRow : false;

			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {

				scope.selectedItem = item; // seleccionamos el objeto

				// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === scope.items.length){
					scope.$root.isNextEnabled = true;
				}
			};

			// Para usar el html en angular
			scope.sanitize = function (item) {
				return $sce.trustAsHtml(item);
			}

			/**
			 * Devuelve los estilos personalizados de los items
			 */
			scope.getItemStyles = function () {
				var styles = "";

				if(scope.itemsPerRow){
					styles += "width: " + (97 / scope.itemsPerRow) + "%;";
				}else{
				styles += "width: " + (100 / (scope.items/2)) + "%;";
				};

				return styles;
			};

		}
	}; 
});


var lizShowParts = angular.module('lizShowParts', []);

lizShowParts.directive('showParts', function () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			title: '@',
			description: '@'
		},
		templateUrl: '../views/concepts/show_parts.html',
		link: function (scope, element, attrs) {

			var opt = scope.options,
				completedItems = 0; // Contador usado para definir el fin de la actividad

			scope.canvas = opt.canvas;
			scope.alt = opt.alt;
			scope.items = opt.items;
			scope.selectedItem = false; // Elemento actual

			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {

				scope.selectedItem = item;

				// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === scope.items.length){
					scope.$root.isNextEnabled = true;
				}

			};

			/**
			 * Devuelve los estilos del item-title
			 */
			scope.getItemTitleStyles = function (item) {
				return "width: " + item.position.w + "em;" +
					"top: " + item.position.t + "em;" +
					"left: " + item.position.l + "em;"; 
			};
			

		}
	}; 
});

var lizShowTextCharacter = angular.module('lizShowTextCharacter', []);

lizShowTextCharacter.directive('showTextCharacter', function () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			title: '@',
			description: '@',
			audio:'@',
			instruction: '@',
			alt: '@',
			mainimg: '@'
		},
		templateUrl: '../views/concepts/show_text_character.html',
		link: function (scope, element, attrs) {

			var opt = scope.options,
				completedItems = 0;
				
			scope.items = opt.items;
			scope.itemsPerRow = opt.itemsPerRow ? opt.itemsPerRow : 1;
			scope.imgStyle = opt.imgStyle ? opt.imgStyle : false;
			scope.selectedItem = false; // elemento seleccionado
			scope.itemsStyle = opt.itemsStyle

			console.log(scope.itemsPerRow);

			/**
			 * si no hay elementos que mostrar simplemente se activa el boton adelante
			 */
			if (scope.items.length === 0){
				scope.$root.isNextEnabled = true;
			}

			/**
			 * si no hay elementos que escuchar simplemente se activa el boton adelante
			 */
			if(!scope.items.src){
				scope.$root.isNextEnabled = true;
			}
			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {

				scope.selectedItem = item; // seleccionamos el objeto

				// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === (scope.items.length + scope.items2.length) ){
					scope.$root.isNextEnabled = true;
				}
			};

			/**
			 * Devuelve los estilos personalizados de los items
			 */
			scope.getItemStyles = function () {
				var styles = "";

				styles += "width: " + (100 / scope.itemsPerRow) + "%;";

				return styles;
			};

		}
	}; 
});


var lizSlideShowCharacter = angular.module('lizSlideShowCharacter', []);

lizSlideShowCharacter.directive('slideShowCharacter', function () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			title: '@',
			description: '@',
			audio:'@',
			instruction: '@',
			mainimg: '@'
		},
		templateUrl: '../views/concepts/slideshow_character.html',
		link: function (scope, element, attrs) {
			var opt = scope.options;

			scope.items = opt.items;
			scope.ext = opt.ext ? opt.ext : '.png';
			scope.customClass = opt.customClass;

			/**
			 * Devuelve los estilos personalizados de los items
			 */
			scope.getItemStyles = function () {
				var styles = "";

				styles += "width: " + (100 / 1) + "%;";

				return styles;
			};

		}
	}; 
});

lizSlideShowCharacter.directive('slides', function($timeout){
	return {
	    restrict: 'A',
			scope: {
				items: '='
			},
	    link : function (scope, element, attrs) {
				$timeout(function(){
					$(element).slidesjs({
						width: 500,
						height: 550,
						navigation: {
							active: true,
							// [boolean] Generates next and previous buttons.
							// You can set to false and use your own buttons.
							// User defined buttons must have the following:
							// previous button: class="slidesjs-previous slidesjs-navigation"
							// next button: class="slidesjs-next slidesjs-navigation"
							effect: "slide"
							// [string] Can be either "slide" or "fade".
						},
						pagination: {
							active: false,
							// [boolean] Create pagination items.
							// You cannot use your own pagination. Sorry.
						},
						callback: {
							complete: function (number) {
								// Activa el siguiente cuando llega a la última diapositiva
								if(number === scope.items.length) {
									scope.$root.isNextEnabled = true;
									scope.$apply();
								}
							}
						}
					});
				});
    	}
	};
});

var lizTable = angular.module('lizTable', []);

lizTable.directive('tableConcept', function () {
	return {
		restrict: 'E',
		templateUrl: '../views/concepts/table.html',
		scope: {
			options: "=",
			title: '@',
			audio: '@',
			instruction: '@',
			description: '@',
			buttonText: '@'
		},
		link: function (scope) {

			var opt = scope.options;

			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;

			scope.head = opt.head;
			scope.body = opt.body;
			scope.buttonText = scope.buttonText;

			scope.$root.isNextEnabled = true;

		}
	};
});

var lizText1 = angular.module('lizText1', []);

lizText1.directive('text1', function ($sce) {
	return {
		restrict: 'E',
		templateUrl: '../views/concepts/text1.html',
		scope: {
			descriptionTop: '@',
			title: '@',
			description: '@',
			audio:'@',
			img: '@',
			titletop: '@',
			titlemain:'@',
			imgTitle: '@',
			alt: '@',
			click:'@',
			block: "@",
			float: '@'
		},

		link: function (scope) {
			scope.$root.isNextEnabled = true;

		// Para usar el html en angular
		scope.sanitize = function (item) {
			return $sce.trustAsHtml(item);
		}

		}
	};
});

var lizTransclusion = angular.module('lizTransclusion', []);

lizTransclusion.directive('transclusion', function ($sce) {
	return {
		restrict: 'E',
		templateUrl: '../views/concepts/transclusion.html',
		transclude: true,
		scope: {
			title: '@',
			description: '@',
			instruction: '@',
			audio: '@',
			arrow: '=',
			addicon: '@',
      		mouse: '='
		},

		link: function (scope) {

			// Para usar el html en angular
			scope.sanitize = function (item) {
				return $sce.trustAsHtml(item);
			}

		}
	};
});

var lizTransclusions = angular.module('lizTransclusions', []);

lizTransclusions.directive('transclusions', function () {
	return {
		restrict: 'E',
		templateUrl: '../views/concepts/transclusions.html',
		transclude: true,
		scope: {
			title: '@',
			description: '@',
			instruction: '@',
			audio: '@',
			arrow: '=',
			addicon: '@',
      		mouse: '='
		}
	};
   
});

var lizTwoFramesDescription = angular.module('lizTwoFramesDescription', []);

lizTwoFramesDescription.directive('twoFramesDescription', function ($timeout) {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			title: '@',
			description: '@',
			audio:'@',
			instruction: '@'
		},
		templateUrl: '../views/concepts/two_frames_description.html',
		link: function (scope, element, attrs) {
			var opt = scope.options,
				completedItems = 0;

			scope.items = opt.items;
			scope.selectedItem = false; // elemento seleccionado

			/**
			 * Selecciona el elemento indicado
			 */
			scope.selectItem = function (item) {
				scope.selectedItem = item; // seleccionamos el objeto

				// Contamos los elementos completos
				if(!item.hasOwnProperty('isCompleted')){
					item.isCompleted = true; // marcamos el elemento, para no volver a seleccionarlo
					completedItems++;
				}

				// Fin de la actividad
				if(completedItems === scope.items.length){
					scope.$root.isNextEnabled = true;
				}

				// Captura el alto de text-block
				$timeout(function(){
					var $textBlock = element.find('.text-box'),
						$mainImg = element.find('.main-img-inner');

					$mainImg.height( $textBlock.height() - ( parseInt($mainImg.css('border-width')) * 2 ) );
				}, 100);
			};


		}
	}; 
});


var lizWatch = angular.module('lizWatch', []);

lizWatch.directive('watch', function () {
	return {
		restrict: 'E',
		templateUrl: '../views/concepts/watch.html',
		scope: {
			options: "=",
			title: '@',
			description: '@',
			instruction: '@',
			audio:'@'
		},
		link: function (scope, element, attrs) {
			scope.items = scope.options; // Elementos a mostrar
			scope.$root.isNextEnabled = true; // Activamos el botón de siguiente
		}
	};
});

var lizZoom = angular.module('lizZoom', []);

lizZoom.directive('zoom', function  () {
	return {
		restrict: 'E',
		scope: {
			options: '=',
			title: '@',
			instruction: '@',
			audio: '@',
			img: '@',
			bigImg: '@',
			alt: '@',
			description: '@'
		},
		templateUrl: '../views/concepts/zoom.html',
		link: function postLink(scope, element, attrs) {
			var opt = scope.options;

							
			// Si la descripción o el título están, entonces la instrucción va al fondo
			scope.isBottom = scope.title || scope.description;

			scope.mainimgstyles = opt.mainimgstyles;
			scope.items = opt.items;
			
			scope.showBig = false;

			/**
			 * Cierra el zoom y completa la actividad
			 */
			scope.complete = function () {
				scope.showBig = false;
				scope.$root.isNextEnabled = true;
			};
			
		}
	}; 
});

var directives = angular.module('directives', []);


// ======================================================================================
// Bases para la aplicación
// ======================================================================================

// Directiva de felicitaciones
directives.directive('congratulations', function () {
	return {
		restrict: 'A',
		templateUrl: '../views/common/congratulations.html'
	};
});

// Directiva de vuelve a intentarlo
directives.directive('failure', function () {
	return {
		restrict: 'A',
		templateUrl: '../views/common/failure.html',
		controller: function ($scope, $route) {
			$scope.refresh = function () {
				$route.reload();
			}
		}
	};
});

// Competencias
directives.directive('competences', function () {
	return {
		restrict: 'E',
		scope: {
			description1: '@',
			description2: '@'
		},
		templateUrl: '../views/common/competences.html',
		link: function (scope, element, attrs) {
			scope.$root.isNextEnabled = true;
		}
	};
});

// Show Tooltip
directives.directive('showTooltip', function () {
	return {
		restrict: 'C',
		link: function (scope, iElement, iAttrs) {
			$(iElement).tooltip({
				title: scope.word.title
			});
		}
	};
});

// Show Tooltip Attribute
directives.directive('showTooltip', function () {
	return {
		restrict: 'A',
		link: function (scope, iElement, iAttrs) {
			var title = scope.$parent.group.titles[scope.$index];
			$(iElement).tooltip({
				title: title,
				placement: "bottom"
			});
		}
	};
});

// Image zoom
directives.directive('ngElevateZoom', function () {
	return {
		restrict: 'A',
		link: function (scope, iElement, iAttrs) {
			//Will watch for changes on the attribute
		    iAttrs.$observe('zoomImage',function(){
		    	linkElevateZoom();
		    });
		      
		    function linkElevateZoom(){
		    	//Check if its not empty
		        if (!iAttrs.zoomImage) return;
		        iElement.attr('data-zoom-image',iAttrs.zoomImage);
		        $(iElement).elevateZoom();
		    }
		      
		    linkElevateZoom();
		}
	};
});

// Image popup
directives.directive('ngImagePopup', function () {
	return {
		restrict: 'A',
		link: function (scope, iElement, iAttrs) {
			console.log(arguments);
			$(iElement).magnificPopup({
				items: {
					src: scope.$root.resources + "/" + scope.modalSrc
				},
				type: "image"
			});
		}
	};
});


// ======================================================================================
// Útiles
// ======================================================================================

// Reproduce un sonido en el evento definido en la directiva. Ejm: hover => mouseenter
directives.directive('play', function () {
	return function (scope, element, attrs) {
		element.bind(attrs.on, function () {
			var sound = $('#' + attrs.play)[0];

			sound.load();
			sound.play();
		});
	}
});

// Crea un pequeño fade in del elemento cuando se cambia el valor del modelo
directives.directive('flash', function () {
	return {
		restrict: 'A',
		scope: {
			flash: '=flash'
		},
		link: function (scope, element, attrs) {
			scope.$watch('flash', function (flash) {
				if(flash){
					$(element).stop().hide().text(flash).fadeIn(function() {
						clearTimeout($(element).data("timeout"));
						$(element).data("timeout", setTimeout(function() {
							$(element).fadeOut();
						}, 1000));
					});
				}
			});
		}
	};
});


var appManager = AppManager();
var esp101 = angular.module('esp101', ['activities']);

appManager.configModule(esp101, {
	resources: '../resources/01/esp/01',
	farewell: '¡Excelente amiguito, ya conoces la letra t!',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia español lección N° 1”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados.',
	competences1:'Produzco textos escritos que responden a diversas necesidades comunicativas.',
	competences2:'Identifica las letras del abecedario relacionándolas a imágenes que comienzan por ellas.',
	routes: [
		{ 
			name: '/aprendo-la-letra-t', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title:"Lección 1: Aprendo la letra t"
		},
		{ 
			name: '/aprendo-la-letra-t-2',
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title:"Lección 1: Aprendo la letra c"
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title:"Actividad 1 | Lección 1"
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title:"Actividad 2 | Lección 1"
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act2Ctrl',
			title:"Actividad 3 | Lección 1"
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title:"Actividad 4 | Lección 1",
		},
		{ 
			name: '/actividad-5', 
			templateUrl: 'act5', 
			controller: 'Act5Ctrl',
			title:"Actividad 5 | Lección 1",
		}
	]
	
});

esp101.controller('Con1Ctrl', function($scope){
	$scope.test = 'hola mundo';
});

esp101.controller('Con2Ctrl', function($scope){
	$scope.data = [
		{
			resource: 'taza',
			text: '<strong>T</strong>aza'
		},
		{
			resource: 'tela',
			text: '<strong>T</strong>ela'
		},
		{
			resource: 'topo',
			text: '<strong>T</strong>opo'
		}
	];
});

esp101.controller('Act1Ctrl', function($scope){
	$scope.data = {
		items: [
			{ letter: 'c', answer: false },
			{ letter: 'T', answer: true },
			{ letter: 'd', answer: false },
			{ letter: 't', answer: true },
			{ letter: 'i', answer: false }
		],
		minRightAnswers: 2,
		chances: 2
	};
});

esp101.controller('Act2Ctrl', function($scope){
	$scope.items = [
		{
			sil: '<strong>t</strong>a',
			text: "<strong>t</strong>aza",
			resource: "taza"
		},
		{
			sil: '<strong>t</strong>e',
			text: "<strong>t</strong>ela",
			resource: "tela"
		},
		{
			sil: '<strong>t</strong>i',
			text: "<strong>t</strong>ijeras",
			resource: "tijera"
		},
		{
			sil: '<strong>t</strong>o',
			text: "<strong>t</strong>opo",
			resource: "topo"
		},
		{
			sil: '<strong>t</strong>u',
			text: "<strong>t</strong>ucán",
			resource: "tucan"
		}
	];

	$scope.options = {
		data: $scope.items,
		minRightAnswers: 1,
		randomItems: true,
		randomTargets: true
	};
});

esp101.controller('Act4Ctrl', function($scope){
	$scope.inputs = ["ta", "te", "ti", "to", "tu"]; 
});

esp101.controller('Act5Ctrl', function($scope){
	$scope.items = [
		{
			name: "televisor",
			pattern: [0, 1],
			resource: "televisor"
		},
		{
			name: "tubo",
			pattern: [0, 1],
			resource: "tubo"
		},
		{
			name: "tomate",
			pattern: [0, 1],
			resource: "tomate"
		},
		{
			name: "tacones",
			pattern: [0, 1],
			resource: "tacones"
		}
	];

	$scope.options = {
		items: $scope.items,
		chances: 8,
		minRightAnswers: 5
	};
});

var appManager = AppManager();
var esp102 = angular.module('esp102', ['activities']);

appManager.configModule(esp102, {
	resources: '../resources/01/esp/02',
	farewell: '¡Excelente amiguito, ya conoces los medios de comunicación!',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia español lección N° 2”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados.',
	competences1:'Reconozco los medios de comunicación masiva y caracterizo la información que difunden.',
	competences2:'Identifico los diversos medios de comunicación masiva con los que interactúo.',
	routes: [
		
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title: 'Lección 2: Los medios de comunicación'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title: 'Lección 2: Los medios de comunicación'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1 | Lección 2'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title:"Actividad 2 | Lección 2"
		},
		{ 
			name: '/actividad-2-2', 
			templateUrl: 'act2_2', 
			controller: 'Act2_2Ctrl',
			title:"Actividad 2 | Lección 2"
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3 | Lección 2'
		}
	]
	
});

esp102.controller('Con1Ctrl', function ($scope) {
	$scope.data = [
		{ resource: "radio" },
		{ resource: "television" },
		{ resource: "periodico" }
	]
});

esp102.controller('Con2Ctrl', function ($scope) {
	$scope.data = [
		{ resource: "computador" },
		{ resource: "telefono" },
		{ resource: "carta" }
	]
});
esp102.controller('Act1Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				resource: "radio",
				alt: "Una niña hablando con un niño, pidiéndole un favor"
			},
			{
				resource: "periodico",
				alt: "Niña moviendo su mano, saludando"
			},
			{
				resource: "telefono",
				alt: "Niña compartiendo un dulce con un niño"
			},
			{
				resource: "television",
				alt: "Niño y niña dándose la mano en señal de agradecimiento"
			},
			{
				resource: "computador",
				alt: "Niña compartiendo un dulce con un niño"
			},
			{
				resource: "carta",
				alt: "Niño y niña dándose la mano en señal de agradecimiento"
			}
		],
		minRightAnswers: 3
	};
});
esp102.controller('Act2Ctrl', function($scope){
	$scope.items = [
		{
			src1: "telefono",
			src2: "hablar-por-telefono",
			alt2: "niño hablando por teléfono"
		},
		{
			src1: "computador",
			src2: "usar-computador",
			alt2: "Niño escribiendo en su computador"
		},
		{
			src1: "carta",
			src2: "escribir-carta",
			alt2: "niño escribiendo una carta"
		}
	];

	$scope.options = {
		data: $scope.items,
		minRightAnswers: 2,
		randomItems: true,
		randomTargets: true
	};
});
esp102.controller('Act2_2Ctrl', function($scope){
	$scope.items = [
		{
			src1: "radio",
			src2: "oir-radio",
			alt2: "Señor escuchando radio mediante audífonos."
		},
		{
			src1: "periodico",
			src2: "Leer-periodico",
			alt2: "Niño leyendo el periódico"
		},
		{
			src1: "television",
			src2: "ver-tv",
			alt2: "Dos niñas viendo televisión "
		}
	];

	$scope.options = {
		data: $scope.items,
		minRightAnswers: 2,
		randomItems: true,
		randomTargets: true
	};
});
esp102.controller('Act3Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: 'television',
				alt: 'televisión',
				answer: true	
			},
			{
				src: 'telefono',
				alt: 'teléfono',
				answer: true	
			},
			{
				src: 'computador',
				alt: 'computador',
				answer: true	
			},
			{
				src: 'carta',
				alt: 'carta',
				answer: true	
			},
			{
				src: 'radio',
				alt: 'radio',
				answer: true	
			},
			{
				src: 'periodico',
				alt: 'periódico',
				answer: true	
			},
		],
		minRightAnswers: 1,
		activateAfter: 2
	};
});

var appManager = AppManager();
var esp103 = angular.module('esp103', ['activities']);

appManager.configModule(esp103, {
	resources: '../resources/01/esp/03',
	farewell: '¡Excelente amiguito, ya conoces la letra n!',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia español lección N° 3”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados.',
	competences1:'Produzco textos escritos que responden a diversas necesidades comunicativas.',
	competences2:'Identifica las letras del abecedario relacionándolas a imágenes que comienzan por ellas.',
	routes: [
		
		{ 
			name: '/aprendo-la-letra-n', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title:"Lección 3: Aprendo la letra n"
		},
		{ 
			name: '/aprendo-la-letra-n-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title:"Lección 3: Aprendo la letra n"
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title:"Actividad 1 | Lección 3"
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title:"Actividad 2 | Lección 3"
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act2Ctrl',
			title:"Actividad 3 | Lección 3"
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title:"Actividad 4 | Lección 3",
		},
		{ 
			name: '/actividad-5', 
			templateUrl: 'act5', 
			controller: 'Act5Ctrl',
			title:"Actividad 5 | Lección 3",
		}
	]
	
});

esp103.controller('Con1Ctrl', function($scope){
	$scope.test = 'hola mundo';
});

esp103.controller('Con2Ctrl', function($scope){
	$scope.data = [
		{
			resource: 'nino',
			text: '<strong>N</strong>iño'
		},
		{
			resource: 'nido',
			text: '<strong>N</strong>ido'
		},
		{
			resource: 'nudo',
			text: '<strong>N</strong>udo'
		}
	];
});

esp103.controller('Act1Ctrl', function($scope){
	$scope.data = {
		items: [
			{ letter: 'a', answer: false },
			{ letter: 'm', answer: false },
			{ letter: 'N', answer: true },
			{ letter: 's', answer: false },
			{ letter: 'n', answer: true }
		],
		minRightAnswers: 2,
		chances: 2
	};
});

esp103.controller('Act2Ctrl', function($scope){
	$scope.items = [
		{
			sil: '<strong>n</strong>a',
			text: "<strong>n</strong>aranja",
			resource: "naranja"
		},
		{
			sil: '<strong>n</strong>e',
			text: "<strong>n</strong>evera",
			resource: "nevera"
		},
		{
			sil: '<strong>n</strong>i',
			text: "<strong>n</strong>iño",
			resource: "nino"
		},
		{
			sil: '<strong>n</strong>o',
			text: "<strong>n</strong>ota",
			resource: "nota"
			
		},
		{
			sil: '<strong>n</strong>u',
			text: "<strong>n</strong>ube",
			resource: "nube"
			
		}
	];

	$scope.options = {
		data: $scope.items,
		minRightAnswers: 1,
		randomItems: true,
		randomTargets: true
	};
});

esp103.controller('Act4Ctrl', function($scope){
	$scope.inputs = ["na", "ne", "ni", "no", "nu"]; 
});

esp103.controller('Act5Ctrl', function($scope){
	$scope.items = [
		{
			name: "nevera",
			pattern: [0, 1],
			resource: "nevera"
		},
		{
			name: "naranja",
			pattern: [0, 1],
			resource: "naranja"
		},
		{
			name: "niña",
			pattern: [0, 1],
			resource: "niña"
		},
		{
			name: "nueces",
			pattern: [0, 1],
			resource: "nueces"
		}
	];

	$scope.options = {
		items: $scope.items,
		chances: 8,
		minRightAnswers: 5
	};
});

// ===========================================================================
// Importante: Este módulo pertenece a la primera guía de español de primero
// ===========================================================================
var appManager = AppManager();
var esp103_ = angular.module('esp103_', ['activities']);

appManager.configModule(esp103_, {
  resources: '../resources/01/esp/03_/',
  farewell: 'Muy bien amiguito, ahora ya conoces el alfabeto.',
  routes: [
    {
      name: '/conceptualizacion-1',
      templateUrl: 'con1',
      controller: 'Con1Ctrl',
      title:"Actividad 1 | Lección 3"
    },
    { 
      name: '/actividad-1', 
      templateUrl: 'act1', 
      controller: 'Act1Ctrl',
      title:"Actividad 1 | Lección 3"
    },
    { 
      name: '/actividad-2', 
      templateUrl: 'act2', 
      controller: 'Act2Ctrl',
      title:"Actividad 2 | Lección 3"
    },
    { 
      name: '/actividad-3-1',
      templateUrl: 'act3',
      controller: 'Act3-1Ctrl',
      title:"Actividad 3 | Lección 3"
    },
    {
      name: '/actividad-3-2',
      templateUrl: 'act3',
      controller: 'Act3-2Ctrl',
      title:"Actividad 3 | Lección 3"
    },
    {
      name: '/actividad-3-3',
      templateUrl: 'act3',
      controller: 'Act3-3Ctrl',
      title:"Actividad 3 | Lección 3"
    },
    {
      name: '/actividad-3-4',
      templateUrl: 'act3',
      controller: 'Act3-4Ctrl',
      title:"Actividad 3 | Lección 3"
    },
    {
      name: '/actividad-3-5',
      templateUrl: 'act3',
      controller: 'Act3-5Ctrl',
      title:"Actividad 3 | Lección 3"
    },
    {
      name: '/actividad-3-6',
      templateUrl: 'act3',
      controller: 'Act3-6Ctrl',
      title:"Actividad 3 | Lección 3"
    },
    {
      name: '/actividad-3-7',
      templateUrl: 'act3',
      controller: 'Act3-7Ctrl',
      title:"Actividad 3 | Lección 3"
    },
    {
      name: '/actividad-4-1',
      templateUrl: 'act4', 
      controller: 'Act4-1Ctrl',
      title:"Actividad 4 | Lección 3",
    },
    {
      name: '/actividad-4-2',
      templateUrl: 'act4',
      controller: 'Act4-2Ctrl',
      title:"Actividad 4 | Lección 3",
    },
    {
      name: '/actividad-4-3',
      templateUrl: 'act4',
      controller: 'Act4-3Ctrl',
      title:"Actividad 4 | Lección 3",
    }
  ]
  
});

esp103_.controller('Con1Ctrl', function($scope){
  $scope.activateNext = function () {
    $scope.$root.isNextEnabled = true;
  };
});

esp103_.controller('Act1Ctrl', function($scope, $sce){
  var regex = null, // Regex auxiliary variable
    completedLetters = 0; // Contador

  $scope.letters = [
    {
      letter: "a",
      name: "a",
      title: "avión"
    },
    {
      letter: "b",
      name: "be",
      title: "balón"
    },
    {
      letter: "c",
      name: "ce",
      title: "casa"
    },
    {
      letter: "d",
      name: "de",
      title: "dado"
    },
    {
      letter: "e",
      name: "e",
      title: "elefante"
    },
    {
      letter: "f",
      name: "efe",
      title: "flor"
    },
    {
      letter: "g",
      name: "ge",
      title: "gato"
    },
    {
      letter: "h",
      name: "hache",
      title: "hoja"
    },
    {
      letter: "i",
      name: "i",
      title: "iglesia"
    },
    {
      letter: "j",
      name: "jota",
      title: "jugo"
    },
    {
      letter: "k",
      name: "ka",
      title: "kiosco"
    },
    {
      letter: "l",
      name: "ele",
      title: "limón"
    },
    {
      letter: "m",
      name: "eme",
      title: "manzana"
    },
    {
      letter: "n",
      name: "ene",
      title: "naranja"
    },
    {
      letter: "ñ",
      name: "eñe",
      title: "ñandú"
    },
    {
      letter: "o",
      name: "o",
      title: "olla"
    },
    {
      letter: "p",
      name: "pe",
      title: "paleta"
    },
    {
      letter: "q",
      name: "cu",
      title: "queso"
    },
    {
      letter: "r",
      name: "ere",
      title: "ratón"
    },
    {
      letter: "s",
      name: "ese",
      title: "silla"
    },
    {
      letter: "t",
      name: "te",
      title: "tomate"
    },
    {
      letter: "u",
      name: "u",
      title: "uvas"
    },
    {
      letter: "v",
      name: "ve",
      title: "vaca"
    },
    {
      letter: "w",
      name: "ve doble",
      title: "wilson"
    },
    {
      letter: "x",
      name: "equis",
      title: "xilófono"
    },
    {
      letter: "y",
      name: "ye",
      title: "yate"
    },
    {
      letter: "z",
      name: "zeta",
      title: "zanahoria"
    }
  ];

  $scope.selectedLetter = false; // Letra seleccionada en cada momento

  // Añadimos la propiedad src a cada una
  $scope.letters.forEach(function (l) {
    // Recurso de la imagen
    if(l.letter !== 'ñ') l.src = l.letter;
    else l.src = 'n_'; // para la ñ

    regex = new RegExp(l.letter, "g");

    // Modifica el título en base a la letra, añadiendo strong
    l.title = l.title.replace(regex, '<strong>' + l.letter + '</strong>')
  });


  /**
   * Remueve la letra al dar click.
   * @param letter
   */
  $scope.remove = function (letter) {
    $scope.selectedLetter = letter; // selecciona la letra
    letter.hide = true; // oculta

    completedLetters += 1;

    // Fin de la actividad
    if(completedLetters === $scope.letters.length) {
      $scope.$root.isNextEnabled = true;
      $scope.success = true;
    }
  };

  /**
   * filtra el html antes de usarlo de forma segura.
   */
  $scope.sanitize = function (str) {
    return $sce.trustAsHtml(str);
  };

});

esp103_.controller('Act2Ctrl', function($scope){
  $scope.data = {
    items: [
      { letter: 'a' },
      { letter: 'h' },
      { letter: 'c' },
      { letter: 'd' },
      { letter: 'e' },
      { letter: 'f' },
      { letter: 'o' },
      { letter: 'i' },
      { letter: 'u' }
    ],
    itemTemplate: '<div style="font-size: 65px; width: 70px; cursor: move; text-align:center;">{{ item.letter }}</div>',
    showIf: "letter",
    targets: 5,
    chances: 6,
    minRightAnswers: 3,
    pass: function (target) {
      return "aeiou".search(target.letter) >= 0;
    }
  };
});

esp103_.controller('Act3-1Ctrl', function($scope){
  $scope.items = [
    {
      name: "avión",
      letter: "a"
    },
    {
      name: "balón",
      letter: "b"
    },
    {
      name: "casa",
      letter: "c"
    },
    {
      name: "dado",
      letter: "d"
    }
  ];

  $scope.items.forEach(function (item) {
    item.src = item.letter;
  });

  $scope.description = "Las letras del abecedario pueden escribirse de diferentes formas y tamaños, pero su nombre nunca cambia. Arrastra el objeto hacia el cuadro que contiene la letra con la cual comienza su nombre.";

  $scope.data = {
    data: $scope.items,
    chances: 8,
    minRightAnswers: 3,
    randomItems: true,
    randomTargets: true,
    padding: false,
    border: false
  };
});

esp103_.controller('Act3-2Ctrl', function($scope){
  $scope.items = [
    {
      name: "elefante",
      letter: "e"
    },
    {
      name: "flor",
      letter: "f"
    },
    {
      name: "gato",
      letter: "g"
    },
    {
      name: "hoja",
      letter: "h"
    }
  ];

  $scope.items.forEach(function (item) {
    item.src = item.letter;
  });

  $scope.description = "Arrastra el objeto hacia el cuadro que contiene la letra con la cual comienza su nombre.";

  $scope.data = {
    data: $scope.items,
    chances: 8,
    minRightAnswers: 3,
    randomItems: true,
    randomTargets: true,
    padding: false,
    border: false
  };
});

esp103_.controller('Act3-3Ctrl', function($scope){
  $scope.items = [
    {
      name: "iglesia",
      letter: "i"
    },
    {
      name: "jugo",
      letter: "j"
    },
    {
      name: "limón",
      letter: "l"
    },
    {
      name: "kiosco",
      letter: "k"
    }
  ];

  $scope.items.forEach(function (item) {
    item.src = item.letter;
  });

  $scope.description = "Arrastra el objeto hacia el cuadro que contiene la letra con la cual comienza su nombre.";

  $scope.data = {
    data: $scope.items,
    chances: 8,
    minRightAnswers: 3,
    randomItems: true,
    randomTargets: true,
    padding: false,
    border: false
  };
});

esp103_.controller('Act3-4Ctrl', function($scope){
  $scope.items = [
    {
      name: "manzana",
      letter: "m"
    },
    {
      name: "naranja",
      letter: "n"
    },
    {
      name: "ñandú",
      letter: "ñ"
    },
    {
      name: "olla",
      letter: "o"
    }
  ];

  $scope.items.forEach(function (item) {
    if(item.letter !== "ñ") item.src = item.letter;
    else item.src = "n_";
  });

  $scope.description = "Arrastra el objeto hacia el cuadro que contiene la letra con la cual comienza su nombre.";

  $scope.data = {
    data: $scope.items,
    chances: 8,
    minRightAnswers: 3,
    randomItems: true,
    randomTargets: true,
    padding: false,
    border: false
  };
});

esp103_.controller('Act3-5Ctrl', function($scope){
  $scope.items = [
    {
      name: "paleta",
      letter: "p"
    },
    {
      name: "queso",
      letter: "q"
    },
    {
      name: "ratón",
      letter: "r"
    },
    {
      name: "silla",
      letter: "s"
    }
  ];

  $scope.items.forEach(function (item) {
    item.src = item.letter;
  });

  $scope.description = "Arrastra el objeto hacia el cuadro que contiene la letra con la cual comienza su nombre.";

  $scope.data = {
    data: $scope.items,
    chances: 8,
    minRightAnswers: 3,
    randomItems: true,
    randomTargets: true,
    padding: false,
    border: false
  };
});

esp103_.controller('Act3-6Ctrl', function($scope){
  $scope.items = [
    {
      name: "tomate",
      letter: "t"
    },
    {
      name: "uvas",
      letter: "u"
    },
    {
      name: "vaca",
      letter: "v"
    },
    {
      name: "Wilson",
      letter: "w"
    }
  ];

  $scope.items.forEach(function (item) {
    item.src = item.letter;
  });

  $scope.description = "Arrastra el objeto hacia el cuadro que contiene la letra con la cual comienza su nombre.";

  $scope.data = {
    data: $scope.items,
    chances: 8,
    minRightAnswers: 3,
    randomItems: true,
    randomTargets: true,
    padding: false,
    border: false
  };
});

esp103_.controller('Act3-7Ctrl', function($scope){
  $scope.items = [
    {
      name: "xilófono",
      letter: "x"
    },
    {
      name: "yate",
      letter: "y"
    },
    {
      name: "zanahoria",
      letter: "z"
    }
  ];

  $scope.items.forEach(function (item) {
    item.src = item.letter;
  });

  $scope.description = "Arrastra el objeto hacia el cuadro que contiene la letra con la cual comienza su nombre.";

  $scope.data = {
    data: $scope.items,
    chances: 8,
    minRightAnswers: 3,
    randomItems: true,
    randomTargets: true,
    padding: false,
    border: false
  };
});

esp103_.controller('Act4-1Ctrl', function($scope){
  $scope.items = [
    {
      name: "hoja",
      pattern: [0],
      resource: "h"
    },
    {
      name: "manzana",
      pattern: [0, 3],
      resource: "m"
    },
    {
      name: "flor",
      pattern: [0, 3],
      resource: "f"
    },
    {
      name: "zanahoria",
      pattern: [0, 4],
      resource: "z"
    }
  ];

  $scope.options = {
    items: $scope.items,
    chances: 7,
    minRightAnswers: 4
  };
});

esp103_.controller('Act4-2Ctrl', function($scope){
  $scope.items = [
    {
      name: "kiosco",
      pattern: [0, 3, 4],
      resource: "k"
    },
    {
      name: "naranja",
      pattern: [0, 2, 5],
      resource: "n"
    },
    {
      name: "xilófono",
      pattern: [0, 4, 6],
      resource: "x"
    },
    {
      name: "ñandú",
      pattern: [0, 2, 3],
      resource: "n_"
    }
  ];

  $scope.options = {
    items: $scope.items,
    chances: 12,
    minRightAnswers: 7
  };
});

esp103_.controller('Act4-3Ctrl', function($scope){
  $scope.items = [
    {
      name: "balón",
      pattern: [0, 2, 4],
      resource: "b"
    },
    {
      name: "uvas",
      pattern: [1, 3],
      resource: "u"
    },
    {
      name: "paleta",
      pattern: [0, 2, 4],
      resource: "p"
    },
    {
      name: "gato",
      pattern: [0, 2],
      resource: "g"
    }
  ];

  $scope.options = {
    items: $scope.items,
    chances: 10,
    minRightAnswers: 5
  };
});

var appManager = AppManager();
var esp104 = angular.module('esp104', ['activities']);

appManager.configModule(esp104, {
	resources: '../resources/01/esp/04',
	farewell: '¡Excelente amiguito, ya conoces la letra L!',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia español lección N° 4”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados.',
	competences1:'Produzco textos escritos que responden a diversas necesidades comunicativas.',
	competences2:'Identifica las letras del abecedario relacionándolas a imágenes que comienzan por ellas.',
	routes: [
		
		{ 
			name: '/aprendo-la-letra-l', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title:"Lección 4: Aprendo la letra l"
		},
		{ 
			name: '/aprendo-la-letra-l-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title:"Lección 4: Aprendo la letra l"
		},
		
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title:"Actividad 1 | Lección 4"
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title:"Actividad 2 | Lección 4"
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act2Ctrl',
			title:"Actividad 3 | Lección 4"
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title:"Actividad 4 | Lección 4",
			
		},
		{ 
			name: '/actividad-5', 
			templateUrl: 'act5', 
			controller: 'Act5Ctrl',
			title:"Actividad 5 | Lección 4",
			
		}
	]
	
});

esp104.controller('Con1Ctrl', function($scope){
	$scope.test = 'hola mundo';
});

esp104.controller('Con2Ctrl', function($scope){
	$scope.data = [
		{
			resource: 'lampara',
			text: '<strong>L</strong>ámpara'
		},
		{
			resource: 'leon',
			text: '<strong>L</strong>eon'
		},
		{
			resource: 'luna',
			text: '<strong>L</strong>una'
		}
	];
});

esp104.controller('Act1Ctrl', function($scope){
	$scope.data = {
		items: [
			{ letter: 'm', answer: false },
			{ letter: 'L', answer: true },
			{ letter: 'p', answer: false },
			{ letter: 'l', answer: true },
			{ letter: 'o', answer: false }
		],
		minRightAnswers: 2,
		chances: 2
	};
});

esp104.controller('Act2Ctrl', function($scope){
	$scope.items = [
		{
			sil: '<strong>l</strong>a',
			text: "<strong>l</strong>ámpara",
			resource: "lampara"
		},
		{
			sil: '<strong>l</strong>e',
			text: "<strong>l</strong>eon",
			resource: "leon"
		},
		{
			sil: '<strong>l</strong>i',
			text: "<strong>l</strong>ima",
			resource: "lima"
		},
		{
			sil: '<strong>l</strong>o',
			text: "<strong>l</strong>oro",
			resource: "loro"
			
		},
		{
			sil: '<strong>l</strong>u',
			text: "<strong>l</strong>una",
			resource: "luna"
			
		}
	];

	$scope.options = {
		data: $scope.items,
		minRightAnswers: 1,
		randomItems: true,
		randomTargets: true
	};
});

esp104.controller('Act4Ctrl', function($scope){
	$scope.inputs = ["la", "le", "li", "lo", "lu"]; 
});

esp104.controller('Act5Ctrl', function($scope){
	$scope.items = [
		{
			name: "loción",
			pattern: [0, 1],
			resource: "locion"
		},
		{
			name: "lupa",
			pattern: [0, 1],
			resource: "lupa"
		},
		{
			name: "labial",
			pattern: [0, 1],
			resource: "labial"
		},
		{
			name: "libro",
			pattern: [0, 1],
			resource: "libro"
		}
	];

	$scope.options = {
		items: $scope.items,
		chances: 8,
		minRightAnswers: 5
	};
});

var appManager = AppManager();
var esp105 = angular.module('esp105', ['activities']);

appManager.configModule(esp105, {
	resources: '../resources/01/esp/05',
	farewell: '¡Excelente amiguito, ya conoces la letra B!',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia español lección N° 5”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados.',
	competences1:'Produzco textos escritos que responden a diversas necesidades comunicativas.',
	competences2:'Identifica las letras del abecedario relacionándolas a imágenes que comienzan por ellas.',
	routes: [
		
		{ 
			name: '/aprendo-la-letra-b', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title:"Lección 5: Aprendo la letra b"
		},
		{ 
			name: '/aprendo-la-letra-b-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title:"Lección 5: Aprendo la letra b"
		},

		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title:"Actividad 1 | Lección 5"
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title:"Actividad 2 | Lección 5"
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act2Ctrl',
			title:"Actividad 3 | Lección 5"
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title:"Actividad 4 | Lección 5",

		},
		{ 
			name: '/actividad-5', 
			templateUrl: 'act5', 
			controller: 'Act5Ctrl',
			title:"Actividad 5 | Lección 5",
	
		},
		{ 
			name: '/actividad-6', 
			templateUrl: 'act6', 
			controller: 'Act6Ctrl',
			title:"Actividad 6 | Lección 5",
	
		}
	]
	
});

esp105.controller('Con1Ctrl', function($scope){
	$scope.test = 'hola mundo';
});

esp105.controller('Con2Ctrl', function($scope){
	$scope.data = [
		{
			resource: 'balon',
			text: '<strong>B</strong>alón'
		},
		{
			resource: 'bicicleta',
			text: '<strong>B</strong>icicleta'
		},
		{
			resource: 'botas',
			text: '<strong>B</strong>otas'
		}
	];
});

esp105.controller('Act1Ctrl', function($scope){
	$scope.data = {
		items: [
			{ letter: 'b', answer: true },
			{ letter: 'i', answer: false },
			{ letter: 'p', answer: false },
			{ letter: 'l', answer: false },
			{ letter: 'B', answer: true }
		],
		minRightAnswers: 2,
		chances: 2
	};
});

esp105.controller('Act2Ctrl', function($scope){
	$scope.items = [
		{
			sil: '<strong>b</strong>a',
			text: "<strong>b</strong>alón",
			resource: "balon"
		},
		{
			sil: '<strong>b</strong>e',
			text: "<strong>b</strong>ebe",
			resource: "bebe"
		},
		{
			sil: '<strong>b</strong>i',
			text: "<strong>b</strong>icicleta",
			resource: "bicicleta"
		},
		{
			sil: '<strong>b</strong>o',
			text: "<strong>b</strong>otas",
			resource: "botas"
			
		},
		{
			sil: '<strong>b</strong>u',
			text: "<strong>b</strong>úho",
			resource: "buho"
			
		}
	];

	$scope.options = {
		data: $scope.items,
		minRightAnswers: 1,
		randomItems: true,
		randomTargets: true
	};
});

esp105.controller('Act4Ctrl', function($scope){
	$scope.inputs = ["ba", "be", "bi", "bo", "bu"]; 
});

esp105.controller('Act5Ctrl', function($scope){
	$scope.items = [
		{
			name: "baloncesto",
			pattern: [0, 1],
			resource: "baloncesto"
		},
		{
			name: "bolos",
			pattern: [0, 1],
			resource: "bolos"
		},
		{
			name: "beisbol",
			pattern: [0, 1],
			resource: "beisbol"
		},
		{
			name: "bicicross",
			pattern: [0, 1],
			resource: "bicicross"
		}
	];

	$scope.options = {
		items: $scope.items,
		chances: 8,
		minRightAnswers: 5
	};
});
esp105.controller('Act6Ctrl', function($scope){
	$scope.items = [
		{
			name: "buso",
			pattern: [0,2,],
			resource: "buso"
		},
		{
			name: "lobo",
			pattern: [0,2],
			resource: "lobo"
		},
		{
			name: "bate",
			pattern: [0,1,2],
			resource: "bate"
		},
		{
			name: "bote",
			pattern: [0,1,2],
			resource: "bote"
		},
		{
			name: "bola",
			pattern: [0,1,2,3],
			resource: "bola"
		},
		{
			name: "nube",
			pattern: [0,1,2,3],
			resource: "nube"
		}
	];

	$scope.options = {
		items: $scope.items,
		chances: 18,
		minRightAnswers: 10,
		itemsPerRow:3
	};
});

var appManager = AppManager();
var esp106 = angular.module('esp106', ['activities']);

appManager.configModule(esp106, {
	resources: '../resources/01/esp/06',
	farewell: '¡Excelente amiguito, ya conoces la letra C!',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia español lección N° 6”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados.',
	competences1:'Produzco textos escritos que responden a diversas necesidades comunicativas.',
	competences2:'Identifica las letras del abecedario relacionándolas a imágenes que comienzan por ellas.',
	routes: [
		
		{ 
			name: '/aprendo-la-letra-c', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title:"Lección 6: Aprendo la letra c"
		},
		{ 
			name: '/aprendo-la-letra-c-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title:"Lección 6: Aprendo la letra c"
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title:"Actividad 1 | Lección 6"
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title:"Actividad 2 | Lección 6"
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act2Ctrl',
			title:"Actividad 3 | Lección 6"
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title:"Actividad 4 | Lección 6",
		},
		{ 
			name: '/actividad-5', 
			templateUrl: 'act5', 
			controller: 'Act5Ctrl',
			title:"Actividad 5 | Lección 6",
		},
		{ 
			name: '/actividad-6', 
			templateUrl: 'act6', 
			controller: 'Act6Ctrl',
			title:"Actividad 6 | Lección 6",
		}
	]
	
});

esp106.controller('Con1Ctrl', function($scope){
	$scope.test = 'hola mundo';
});

esp106.controller('Con2Ctrl', function($scope){
	$scope.data = [
		{
			resource: 'casa',
			text: '<strong>C</strong>asa'
		},
		{
			resource: 'corazon',
			text: '<strong>C</strong>orazón'
		},
		{
			resource: 'cuchara',
			text: '<strong>C</strong>uchara'
		}
	];
});

esp106.controller('Act1Ctrl', function($scope){
	$scope.data = {
		items: [
			{ letter: 'b', answer: false },
			{ letter: 'o', answer: false },
			{ letter: 'C', answer: true },
			{ letter: 'm', answer: false },
			{ letter: 'c', answer: true }
		],
		minRightAnswers: 2,
		chances: 2
	};
});

esp106.controller('Act2Ctrl', function($scope){
	$scope.items = [
		{
			sil: '<strong>c</strong>a',
			text: "<strong>c</strong>asa",
			resource: "casa"
		},
		{
			sil: '<strong>c</strong>e',
			text: "<strong>c</strong>ebra",
			resource: "cebra"
		},
		{
			sil: '<strong>c</strong>i',
			text: "<strong>c</strong>isce",
			resource: "cisne"
		},
		{
			sil: '<strong>c</strong>o',
			text: "<strong>c</strong>orazón",
			resource: "corazon"
			
		},
		{
			sil: '<strong>c</strong>u',
			text: "<strong>c</strong>uchara",
			resource: "cuchara"
			
		}
	];

	$scope.options = {
		data: $scope.items,
		minRightAnswers: 1,
		randomItems: true,
		randomTargets: true
	};
});

esp106.controller('Act4Ctrl', function($scope){
	$scope.inputs = ["ca", "ce", "ci", "co", "cu"]; 
});

esp106.controller('Act5Ctrl', function($scope){
	$scope.items = [
		{
			name: "cama",
			pattern: [0, 1],
			resource: "cama"
		},
		{
			name: "computador",
			pattern: [0, 1],
			resource: "computador"
		},
		{
			name: "cebolla",
			pattern: [0, 1],
			resource: "cebolla"
		},
		{
			name: "cubiertos",
			pattern: [0, 1],
			resource: "cubiertos"
		}
	];

	$scope.options = {
		items: $scope.items,
		chances: 8,
		minRightAnswers: 5
	};
});
esp106.controller('Act6Ctrl', function($scope){
	$scope.items = [
		{
			name: "cono",
			pattern: [0,2],
			resource: "cono"
		},
		{
			name: "copa",
			pattern: [0, 2],
			resource: "copa"
		},
		{
			name: "boca",
			pattern: [0, 1,2],
			resource: "boca"
		},
		{
			name: "ceja",
			pattern: [0,1,2],
			resource: "ceja"
		},
		{
			name: "cometa",
			pattern: [0,1,2,3,4,5],
			resource: "cometa"
		},
		{
			name: "camisa",
			pattern: [0,1,2,3,4,5],
			resource: "camisa"
		}
	];

	$scope.options = {
		items: $scope.items,
		chances: 22,
		minRightAnswers: 12
	};
});

var appManager = AppManager();
var esp107 = angular.module('esp107', ['activities']);

appManager.configModule(esp107, {
	resources: '../resources/01/esp/07',
	farewell: '¡Excelente amiguito, ya conoces la letra D!',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia español lección N° 7”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados.',
	competences1:'Produzco textos escritos que responden a diversas necesidades comunicativas.',
	competences2:'Identifica las letras del abecedario relacionándolas a imágenes que comienzan por ellas.',
	routes: [
		
		{ 
			name: '/aprendo-la-letra-d', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title:"Lección 7: Aprendo la letra d"
		},
		{ 
			name: '/aprendo-la-letra-d-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title:"Lección 7: Aprendo la letra d"
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title:"Actividad 1 | Lección 7"
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title:"Actividad 2 | Lección 7"
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act2Ctrl',
			title:"Actividad 3 | Lección 7"
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title:"Actividad 4 | Lección 7",
		},
		{ 
			name: '/actividad-5', 
			templateUrl: 'act5', 
			controller: 'Act5Ctrl',
			title:"Actividad 5 | Lección 7",
		},
		{ 
			name: '/actividad-6', 
			templateUrl: 'act6', 
			controller: 'Act6Ctrl',
			title:"Actividad 6 | Lección 7",
		}
	]
	
});

esp107.controller('Con1Ctrl', function($scope){
	$scope.test = 'hola mundo';
});

esp107.controller('Con2Ctrl', function($scope){
	$scope.data = [
		{
			resource: 'dado',
			text: '<strong>D</strong>ado'
		},
		{
			resource: 'dientes',
			text: '<strong>D</strong>ientes'
		},
		{
			resource: 'dos',
			text: '<strong>D</strong>os'
		}
	];
});

esp107.controller('Act1Ctrl', function($scope){
	$scope.data = {
		items: [
			{ letter: 'd', answer: true },
			{ letter: 'p', answer: false },
			{ letter: 'e', answer: false },
			{ letter: 'D', answer: true },
			{ letter: 'l', answer: false }
		],
		minRightAnswers: 2,
		chances: 2
	};
});

esp107.controller('Act2Ctrl', function($scope){
	$scope.items = [
		{
			sil: '<strong>d</strong>a',
			text: "<strong>d</strong>ado",
			resource: "dado"
		},
		{
			sil: '<strong>d</strong>e',
			text: "<strong>d</strong>elfín",
			resource: "delfin"
		},
		{
			sil: '<strong>d</strong>i',
			text: "<strong>d</strong>ientes",
			resource: "dientes"
		},
		{
			sil: '<strong>d</strong>o',
			text: "<strong>d</strong>os",
			resource: "dos"
			
		},
		{
			sil: '<strong>d</strong>u',
			text: "<strong>d</strong>ulce",
			resource: "dulce"
			
		}
	];

	$scope.options = {
		data: $scope.items,
		minRightAnswers: 1,
		randomItems: true,
		randomTargets: true
	};
});

esp107.controller('Act4Ctrl', function($scope){
	$scope.inputs = ["da", "de", "di", "do", "du"]; 
});

esp107.controller('Act5Ctrl', function($scope){
	$scope.items = [
		{
			name: "delantal",
			pattern: [0, 1],
			resource: "delantal"
		},
		{
			name: "durazno",
			pattern: [0, 1],
			resource: "durazno"
		},
		{
			name: "diploma",
			pattern: [0, 1],
			resource: "diploma"
		},
		{
			name: "dominó",
			pattern: [0, 1],
			resource: "domino"
		}
	];

	$scope.options = {
		items: $scope.items,
		chances: 8,
		minRightAnswers: 5
	};
});
esp107.controller('Act6Ctrl', function($scope){
	$scope.items = [
		{
			name: "diadema",
			pattern: [0,3,4,6],
			resource: "diadema"
		},
		{
			name: "cadena",
			pattern: [0, 2,4],
			resource: "cadena"
		},
		{
			name: "bebida",
			pattern: [0, 2,4,5],
			resource: "bebida"
		},
		{
			name: "sandia",
			pattern: [0,2,3,4],
			resource: "sandia"
		},
		{
			name: "nido",
			pattern: [0,1,2,3],
			resource: "nido"
		},
		{
			name: "moneda",
			pattern: [0,1,2,3,4,5],
			resource: "moneda"
		}
	];

	$scope.options = {
		items: $scope.items,
		chances: 25,
		minRightAnswers: 13
	};
});

var appManager = AppManager();
var mat101 = angular.module('mat101', ['activities']);

appManager.configModule(mat101, {
	resources: '../resources/01/mat/01',
	competences1:'Describo, comparo y cuantifico situaciones con números, en diferentes contextos y con diversas representaciones',
	competences2:'Compara dos cantidades identificando las que corresponden a mayor que, menor que e igual a',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia matemáticas lección N° 1”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: '¡Felicitaciones lo has hecho muy bien, estas aprendiendo a contar!',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: function(){},
			title: 'Lección 1: Realizo conteos'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: function(){},
			title: 'Lección 1: Realizo conteos'
		},
		{ 
			name: '/conceptualizacion-3', 
			templateUrl: 'con3', 
			controller: 'Con3Ctrl',
			title: 'Lección 1: Realizo conteos'
		},
		{ 
			name: '/conceptualizacion-4', 
			templateUrl: 'con4', 
			controller: 'Con4Ctrl',
			title: 'Lección 1: Realizo conteos'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3-1', 
			templateUrl: 'act3_1', 
			controller: 'Act3_1Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-3-2', 
			templateUrl: 'act3_2', 
			controller: 'Act3_2Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-4-1', 
			templateUrl: 'act4_1', 
			controller: 'Act4_1Ctrl',
			title: 'Actividad 4',
		},
		{ 
			name: '/actividad-4-2', 
			templateUrl: 'act4_2', 
			controller: 'Act4_2Ctrl',
			title: 'Actividad 4',
		}
	]
});

mat101.controller('Con3Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "cuatro-libros",
			alt: "Cuatro libros ubicados uno encima del otro",
			number: 4
		},
		{ 
			resource: "un-libro",
			alt: "Un libro con su pasta de color naranja",
			number: 1
		}
	]
});

mat101.controller('Con4Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "muchos-globos",
			alt: "Ramillete conformado por siete globos de diferentes colores",
			number: 7
		},
		{ 
			resource: "pocos-globos",
			alt: "Ramillete conformado por cinco globos de diferentes colores",
			number: 5
		}
	]
});

mat101.controller('Act1Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				options: [
					{  
						src: "ocho-lapices",
						alt: "Ocho lápices de colores",
						answer: true  
					},
					{  
						src: "pocos-lapices",
						alt: "Tres lápices de colores",
						answer: false  
					}
				]
			},
			{
				options: [
					{  
						src: "pocos-dulces",
						alt: "pocos dulces de colores",
						answer: false  
					},
					{  
						src: "muchos-dulces",
						alt: "muchos dulces de colores",
						answer: true  
					}
				]
			},
			{
				options: [
					{  
						src: "tres-manzanas",
						alt: "tres manzanas rojas",
						answer: true  
					},
					{  
						src: "manzana-II",
						alt: "una manzana roja",
						answer: false  
					}
				]
			},
			{
				options: [
					{  
						src: "una-colombina",
						alt: "una colombina",
						answer: false  
					},
					{  
						src: "cuatro-colombinas",
						alt: "cuatro colombinas",
						answer: true  
					}
				]
			},
		],
		minRightAnswers: 3
	};

});

mat101.controller('Act2Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				options: [
					{  
						src: "seis-zanahorias",
						alt: "seis zanahorias",
						answer: true  
					},
					{  
						src: "doce-zanahorias",
						alt: "doce zanahorias",
						answer: false  
					}
				]
			},
			{
				options: [
					{  
						src: "siete-flores",
						alt: "siete flores de diferentes colores",
						answer: false  
					},
					{  
						src: "tres-flores",
						alt: "tres flores de diferentes colores",
						answer: true  
					}
				]
			},
			{
				options: [
					{  
						src: "una-estrella",
						alt: "una estrella",
						answer: true  
					},
					{  
						src: "siete-estrellas",
						alt: "siete estrellas",
						answer: false  
					}
				]
			},
			{
				options: [
					{  
						src: "diez-peras",
						alt: "diez peras",
						answer: false  
					},
					{  
						src: "cuatro-peras",
						alt: "cuatro peras",
						answer: true  
					}
				]
			},
		],
		minRightAnswers: 3
	};

});

mat101.controller('Act3_1Ctrl', function ($scope) {
	// Obtenemos el audio deseado
	var source = '<audio id="audio-muchos" preload="auto">' +
					"<source src=\"" + $scope.resources + "/muchos.mp3\" type=\"audio/mpeg\">" +
				'</audio>';

	$('#main-container').append(source);

	$scope.data = {
		data: [
			{
				src: "tres-libros.png",
				alt: "Tres libros ubicados uno encima del otro",
				answer: false
			},
			{
				src: "diez-globos.png",
				alt: "ramillete conformado por muchos globos de diferentes colores"
			},
			{
				src: "dos-colombinas.png",
				alt: "Dos colombinas",
				answer: false
			},
			{
				src: "una-flor.png",
				alt: "una flor morada",
				answer: false
			},
			{
				src: "manzana-II.png",
				alt: "una manzana roja",
				answer: false
			},
			{
				src: "ocho-lapices.png",
				alt: "ocho lápices de diferentes colores"
			},
			{
				src: "siete-naranjas.png",
				alt: "siete naranjas"
			}
		],
		itemsPerRow: 4,
		chances: 3,
		minRightAnswers: 2,
		rightAnswerCallback: function (item) {
			// Reproducimos el audio
			$('#audio-muchos')[0].play();	
		}
	};

});

mat101.controller('Act3_2Ctrl', function ($scope) {
	// Obtenemos el audio deseado
	var source = '<audio id="audio-pocos" preload="auto">' +
					"<source src=\"" + $scope.resources + "/pocos.mp3\" type=\"audio/mpeg\">" +
				'</audio>';

	$('#main-container').append(source);

	$scope.data = {
		data: [
			{
				src: "tres-libros.png",
				alt: "Tres libros ubicados uno encima del otro"
			},
			{
				src: "diez-globos.png",
				alt: "ramillete conformado por muchos globos de diferentes colores",
				answer: false
			},
			{
				src: "dos-colombinas.png",
				alt: "Dos colombinas"
			},
			{
				src: "una-flor.png",
				alt: "una flor morada"
			},
			{
				src: "manzana-II.png",
				alt: "una manzana roja"
			},
			{
				src: "ocho-lapices.png",
				alt: "ocho lápices de diferentes colores",
				answer: false
			},
			{
				src: "siete-naranjas.png",
				alt: "siete naranjas",
				answer: false
			}
		],
		itemsPerRow: 4,
		chances: 3,
		minRightAnswers: 2,
		rightAnswerCallback: function (item) {
			// Reproducimos el audio
			$('#audio-pocos')[0].play();	
		}
	};

});

mat101.controller('Act4_1Ctrl', function ($scope) {
	// Obtenemos el audio deseado
	var source = '<audio id="audio-muchos-animales" preload="auto">' +
					"<source src=\"" + $scope.resources + "/muchos-animales.mp3\" type=\"audio/mpeg\">" +
				'</audio>';

	$('#main-container').append(source);

	$scope.data = {
		data: [
			{
				src: "pocos-animales.png",
				alt: "Un tigre y un elefante caminando por el campo",
				answer: false
			},
			{
				src: "muchos-animales.png",
				alt: "Dos tigres, una cebra, un elefante, un rinoceronte, y un reno caminando por el campo"
			}
		],
		itemsPerRow: 2,
		chances: 1,
		minRightAnswers: 1,
		rightAnswerCallback: function (item) {
			// Reproducimos el audio
			$('#audio-muchos-animales')[0].play();	
		}
	};

});

mat101.controller('Act4_2Ctrl', function ($scope) {
	// Obtenemos el audio deseado
	var source = '<audio id="audio-pocos-peces" preload="auto">' +
					"<source src=\"" + $scope.resources + "/pocos-peces.mp3\" type=\"audio/mpeg\">" +
				'</audio>';

	$('#main-container').append(source);

	$scope.data = {
		data: [
			{
				src: "muchos-peces.png",
				alt: "Seis peces de diferentes colores nadando en el agua",
				answer: false
			},
			{
				src: "pocos-peces.png",
				alt: "Tres peces de diferentes colores nadando en el agua"
			}
		],
		itemsPerRow: 2,
		chances: 1,
		minRightAnswers: 1,
		rightAnswerCallback: function (item) {
			// Reproducimos el audio
			$('#audio-pocos-peces')[0].play();	
		}
	};

});

var appManager = AppManager();
var mat102 = angular.module('mat102', ['activities']);

appManager.configModule(mat102, {
	resources: '../resources/01/mat/02',
	competences1:'Explico –desde mi experiencia– la posibilidad o imposibilidad de ocurrencia de eventos cotidianos',
	competences2:'Diferencia entre contextos adecuados e inadecuados  y lógicos en su espacio y en el de su entorno',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia matemáticas lección N° 2”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: '¡Felicitaciones lo has hecho muy bien!',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title: 'Los absurdos'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3-1', 
			templateUrl: 'act3_1', 
			controller: 'Act3_1Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-3-2', 
			templateUrl: 'act3_2', 
			controller: 'Act3_2Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title: 'Actividad 4',
		}
	]
});

mat102.controller('Con1Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "tv",
			alt: "Un señor viendo televisión, pero la imagen en la televisión se ve al revés"
		},
		{ 
			resource: "peinarse-con-escoba",
			alt: "Una niña peinándose con una escoba"
		},
		{ 
			resource: "echar-comida-en-la-lavadora",
			alt: "Una niña echando a la lavadora una hamburguesa"
		}
	];
});

mat102.controller('Act1Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: "pato-remando",
				alt: "Un pato montado en un bote y remando",
				answer: true	
			},
			{
				src: "dormir",
				alt: "Un niño acostado en la cama durmiendo",
				answer: false	
			},
			{
				src: "pescar-en-la-carretera",
				alt: "Un señor pescando en la carretera",
				answer: true	
			},
			{
				src: "comer",
				alt: "Un niño comiendo pollo con papitas fritas",
				answer: false	
			},
		],
		minRightAnswers: 2,
		chances: 2
	};
});

mat102.controller('Act2Ctrl', function ($scope) {

	$scope.options = {
		data: [
			{
				src1: "lluvia-saliendo-de-sombrilla",
				alt1: "Un señor cubriéndose con su sombrilla, pero de ella cae agua",
				src2: "protegerse-del-agua",
				alt2: "Un señor cubriéndose de la lluvia con su sombrilla"
			},
			{
				src1: "zapato-de-florero",
				alt1: "Una mesa y sobre ella se encuentra un zapato con flores adentro",
				src2: "florero-sobre-mesa",
				alt2: "Una mesa que tiene encima un florero con flores"
			},
			{
				src1: "tomar-el-sol-nevando",
				alt1: "Una señora con vestido de baño acostada sobre su toalla tomando el sol en época de invierno",
				src2: "tomar-el-sol",
				alt2: "Una señora con vestido de baño acostada sobre su toalla tomando el sol en un día soleado"
			}
		],
		minRightAnswers: 2,
		randomItems: true,
		randomTargets: true
	};
});

mat102.controller('Act3_1Ctrl', function ($scope) {

	$scope.data = {
		data: [
			{
				src: "pintar-con-pincel.png",
				alt: "Una señora pintando con un pincel"
			},
			{
				src: "silla.png",
				alt: "una silla"
			},
			{
				src: "avion-con-alas-de-ave.png",
				alt: "un avión con alas de un ave",
				answer: false
			},
			{
				src: "pintar-con-zanahoria.png",
				alt: "Una señora pintando con una zanahoria",
				answer: false
			},
			{
				src: "silla-con-brazos.png",
				alt: "una silla con dos brazos",
				answer: false
			},
			{
				src: "avion.png",
				alt: "un avión"
			}
		],
		minRightAnswers: 2,
		chances: 3
	};
});

mat102.controller('Act3_2Ctrl', function ($scope) {

	$scope.data = {
		data: [
			{
				src: "pintar-con-pincel.png",
				alt: "Una señora pintando con un pincel",
				answer: false
			},
			{
				src: "silla.png",
				alt: "una silla",
				answer: false
			},
			{
				src: "avion-con-alas-de-ave.png",
				alt: "un avión con alas de un ave"
			},
			{
				src: "pintar-con-zanahoria.png",
				alt: "Una señora pintando con una zanahoria"
			},
			{
				src: "silla-con-brazos.png",
				alt: "una silla con dos brazos"
			},
			{
				src: "avion.png",
				alt: "un avión",
				answer: false
			}
		],
		minRightAnswers: 2,
		chances: 3
	};
});

mat102.controller('Act4Ctrl', function ($scope) {
	$scope.data = {
		canvas: 'actividad-absurdos',
		targets: [
			{ w: 22, h: 36, t: 9, l: 74 },
			{ w: 25, h: 28, t: 13, l: 2 },
			{ w: 17, h: 22, t: 0, l: 17 },
			{ w: 17, h: 24, t: 56, l: 30 },
			{ w: 20, h: 28, t: 59, l: 80 },
			{ w: 28, h: 57, t: 40, l: 1 }
		],
		minRightAnswers: 4
	};

});

var appManager = AppManager();
var mat103 = angular.module('mat103', ['activities']);

appManager.configModule(mat103, {
	resources: '../resources/01/mat/03',
	competences1:'Desarrollo habilidades para relacionar dirección, distancia y posición en el espacio',
	competences2:'Reconoce los días de la semana asociándolos con su horario de clases y demás actividades lúdicas y familiaresReconoce los días de la semana asociándolos con su horario de clases y demás actividades lúdicas y familiares',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia matemáticas lección N° 3”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: '¡Felicitaciones ahora ya sabes los días de la semana!',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title: 'Los días de la semana'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title: 'Los días de la semana'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title: 'Actividad 4',
		}
	]
});

mat103.controller('Con1Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "lunes",
			text: "Lunes",
			hideImg: true,
			textClass: "day yellow"
		},
		{ 
			resource: "martes",
			text: "Martes",
			hideImg: true,
			textClass: "day green"
		},
		{ 
			resource: "miercoles",
			text: "Miércoles",
			hideImg: true,
			textClass: "day blue"
		},
		{ 
			resource: "jueves",
			text: "Jueves",
			hideImg: true,
			textClass: "day red"
		},
		{ 
			resource: "viernes",
			text: "Viernes",
			hideImg: true,
			textClass: "day purple"
		},
		{ 
			resource: "sabado",
			text: "Sábado",
			hideImg: true,
			textClass: "day pink"
		},
		{ 
			resource: "domingo",
			text: "Domingo",
			hideImg: true,
			textClass: "day brown"
		}
	];
});

mat103.controller('Con2Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "estudiar",
			alt: "Niño leyendo un libro"
		},
		{ 
			resource: "trabajar",
			alt: "Señor haciendo un trabajo en su computador"
		},
		{ 
			resource: "descansar",
			alt: "Niña sentada en una silla, tomando jugo"
		}
	];
});

mat103.controller('Act1Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				resource: "lunes",
				text: "Lunes",
				textClass: "day yellow"
			},
			{
				resource: "martes",
				text: "Martes",
				textClass: "day green"
			},
			{
				resource: "miercoles",
				text: "Miércoles",
				textClass: "day blue"
			},
			{
				resource: "jueves",
				text: "Jueves",
				textClass: "day red"
			},
			{
				resource: "viernes",
				text: "Viernes",
				textClass: "day purple"
			},
			{
				resource: "sabado",
				text: "Sábado",
				textClass: "day pink"
			},
			{
				resource: "domingo",
				text: "Domingo",
				textClass: "day brown"
			}
		],
		minRightAnswers: 3
	};
});

mat103.controller('Act2Ctrl', function ($scope) {
	$scope.options = {
		data: [
		{ 
			text: "Lunes",
			audio: "lunes",
			textClass: "day yellow"
		},
		{ 
			text: "Martes",
			audio: "martes",
			textClass: "day green"
		},
		{ 
			text: "Miércoles",
			audio: "miercoles",
			textClass: "day blue"
		},
		{ 
			text: "Jueves",
			audio: "jueves",
			textClass: "day red"
		},
		{ 
			text: "Viernes",
			audio: "viernes",
			textClass: "day purple"
		},
		{ 
			text: "Sábado",
			audio: "sabado",
			textClass: "day pink"
		},
		{ 
			text: "Domingo",
			audio: "domingo",
			textClass: "day brown"
		}
		],
		chances: 7,
		minRightAnswers: 4,
		randomItems: true,
		randomTargets: true,
		rightAnswerCallback: function (item) {
			$('#audio-' + item.audio)[0].play();
		},
		border: false, // sin borde
		padding: false // sin padding
	};
});

mat103.controller('Act3Ctrl', function ($scope) {
	$scope.data = {
		groups: [
			{
				name: "Lunes",
				min: 1
			},
			{
				name: "Martes",
				min: 1
			},
			{
				name: "Miércoles",
				min: 1
			},
			{
				name: "Jueves",
				min: 1
			},
			{
				name: "Viernes"	
			},
			
		],
		stack: [
			{
				src: "icon_esp",
				alt: "Cuadrado de color naranjado que tiene en la parte superior las letras a, b y c de color blanco, este Cuadrado representa el área de español",
				copies: 2
			},
			{
				src: "icon_soc",
				alt: "Cuadrado de color azul que tiene en la parte superior el mapa de Colombia, este Cuadrado representa el área de ciencias sociales",
				copies: 2
			},
			{
				src: "icon_mat",
				alt: "Cuadrado de color rojo que tiene en la parte superior los números uno, dos y tres, este Cuadrado representa el área de matemáticas",
				copies: 2
			},
			{
				src: "icon_nat",
				alt: "Cuadrado de color verde que tiene en la parte superior un árbol de color blanco, Este Cuadrado representa el área de ciencias naturales",
				copies: 2
			}

		],
		
			maxElementsPerGroup: 2
	};
});

mat103.controller('Act4Ctrl', function ($scope) {

	$scope.data = {
		groups: [
			{
				name: "Lunes",
				min: 1
			},
			{
				name: "Martes",
				min: 1
			},
			{
				name: "Miércoles",
				min: 1
			},
			{
				name: "Jueves",
				min: 1
			},
			{
				name: "Viernes",
				min: 1
			}
		],
		stack: [
			{
				src: "ayudar",
				alt: "Niña trapeando"
			},
			{
				src: "comer",
				alt: "niña comiendo papitas fritas con pollo"
			},
			{
				src: "estudiar",
				alt: "niño estudiando",
				copies: 2
			},
			{
				src: "jugar",
				alt: "Niño y niña jugando con un balón"
			},
			{
				src: "ver-tv",
				alt: "dos niñas viendo televisión"
			},
			{
				src: "banarse",
				alt: " niño bañándose",
				copies: 2
			},
			{
				src: "descansar",
				alt: "Niña sentada en una silla, tomando jugo"
			},
			{
				src: "dormir",
				alt: "niño durmiendo sobre su cama"
			},
			{
				src: "deporte",
				alt: "niño jugando con su balón de fútbol"
			},
			{
				src: "cepillarse",
				alt: "niña cepillándose los dientes"
			},
			{
				src: "trabajar-en-computador",
				alt: "niño trabajando en su computador"
			},
			{
				src: "jugar-2",
				alt: "niña jugando con un balón"
			}
		],
		maxElementsPerGroup: 2
	};
});




var appManager = AppManager();
var mat104 = angular.module('mat104', ['activities']);

appManager.configModule(mat104, {
	resources: '../resources/01/mat/04',
	competences1: 'Reconozco significados del número en diferentes contextos (medición, conteo, comparación, codificación, localización entre otros)',
	competences2: 'Compara cantidades iguales con objetos y simbolos en conjuntos',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia matemáticas lección N° 4”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: '¡Felicitaciones!, estás contando muy bien',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title: 'Cantidades iguales'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title: 'Cantidades iguales'
		},
		{ 
			name: '/conceptualizacion-3', 
			templateUrl: 'con3', 
			controller: 'Con3Ctrl',
			title: 'Cantidades iguales'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title: 'Actividad 4',
		}
	]
});

mat104.controller('Con1Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "cinco-gatos",
			alt: "Conjunto conformado por cinco gatos",
			number: 5
		},
		{ 
			resource: "cinco-perros",
			alt: "Conjunto conformado por cinco perros",
			number: 5
		}
	]
});

mat104.controller('Con2Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "flores",
			alt: "Conjunto conformado por cuatro flores de color naranjado",
			number: 4
		},
		{ 
			resource: "globos",
			alt: "Conjunto conformado por cuatro globos de color verde",
			number: 4
		}
	]
});

mat104.controller('Con3Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "estrellas",
			alt: "Conjunto conformado por dos estrellas",
			number: 2
		},
		{ 
			resource: "balones",
			alt: "Conjunto conformado por dos balones de colores",
			number: 2
		}
	]
});

mat104.controller('Act1Ctrl', function ($scope) {
	$scope.options = {
		data: [
			{
				src1: "conjunto-manzanas",
				alt1: "Profesor enseñando las vocales en el tablero",
				src2: "conjunto-lapices",
				alt2: "Tablero"
			},
			{
				src1: "conjunto-perros",
				alt1: "Chef con un pollo asado en sus manos",
				src2: "conjunto-sillas",
				alt2: "Cucharón, olla y sartén"
			},
			{
				src1: "conjunto-globos",
				alt1: "Bombero con extintor a un lado",
				src2: "conjunto-computadores",
				alt2: "Extintor"
			},
			{
				src1: "conjunto-helados",
				alt1: "Médico con un tarro de medicinas en su mano",
				src2: "conjunto-naranjas",
				alt2: "Aparato usado por los médicos para oír los sonidos internos del cuerpo humano"
			}
		],
		minRightAnswers: 3,
		randomItems: true,
		randomTargets: true,
		padding: false,
		border: false
	};
});

mat104.controller('Act2Ctrl', function ($scope) {
	$scope.options = {
		data: [
			{
				number: 1,
				color: "#7030A0"
			},
			{
				number: 2,
				color: "#FF0000"
			},
			{
				number: 3,
				color: "#00B050"
			},
			{
				number: 4,
				color: "#FFC000"
			},
			{
				number: 5,
				color: "#00B0F0"
			}
		],
		minRightAnswers: 3,
		randomItems: true,
		randomTargets: true,
		padding: false,
		border: false
	};
});

mat104.controller('Act3Ctrl', function ($scope) {
	$scope.options = {
		items: [
			{
				number: 2,
				textClass: "red",
				answer: true
			},	
			{
				number: 4,
				textClass: "yellow"
			},	
			{
				number: 7,
				textClass: "green"
			},	
			{
				number: 8,
				textClass: "purple",
				answer: true
			},	
			{
				number: 9,
				textClass: "blue",
				answer: true
			}
		],
		pairs: 3,
		chances: 6,
		minRightAnswers: 2
	};

});

mat104.controller('Act4Ctrl', function ($scope) {

	$scope.options = {
		data: [
			{
				number: 2,
				src: "conjunto-mesas",
				alt: "Conjunto conformado por dos mesas"
			},
			{
				number: 3,
				src: "conjunto-camas",
				alt: "conjunto conformado por tres camas"
			},
			{
				number: 4,
				src: "conjunto-sillas-2",
				alt: "Conjunto conformado por cuatro sillas"
			},
			{
				number: 5,
				src: "conjunto-cucharas",
				alt: "conjunto conformado por cinco cucharas"
			}
		],
		minRightAnswers: 3,
		randomItems: true,
		randomTargets: true,
		padding: false,
		border: false
	};
});

var appManager = AppManager();
var mat105 = angular.module('mat105', ['activities']);

appManager.configModule(mat105, {
	resources: '../resources/01/mat/05',
	competences1: 'Describo, comparo y cuantifico situaciones con números, en diferentes contextos y con diversas representaciones',
	competences2: 'Reconoce el uso de los conjuntos para hacer agrupaciones de objetos de acuerdo a sus características',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia matemáticas lección N° 5”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: '¡Felicitaciones!, ahora ya sabes agrupar elementos similares',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title: 'Agrupo objetos por características iguales'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title: 'Agrupo objetos por características iguales'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title: 'Actividad 4',
		}
	]
});

mat105.controller('Con1Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "conjunto-animales",
			alt: "Círculo con cinco animales adentro: elefante, cebra, tigre, rinoceronte y reno"
		},
		{ 
			resource: "conjunto-transporte",
			alt: "Círculo que contiene en su interior un avión, una moto, un carro y un barco"
		}
	]
});

mat105.controller('Con2Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "conjunto-frutas",
			alt: "Círculo que contiene en su interior una fresa, un banano, una pera, una naranja, una manzana y un racimo de uvas"
		},
		{ 
			resource: "conjunto-verduras",
			alt: "Círculo que contiene en su interior una zanahoria, arvejas, un tomate, un pimentón, un repollo y un ajo"
		}
	]
});

mat105.controller('Act1Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				resource: "conjunto-juguetes",
				alt: "conjunto de juguetes conformado por una muñeca, un tambor, un balde y una pala, una volqueta y un trencito de madera"
			},
			{
				resource: "conjunto-arboles",
				alt: "Conjunto conformado por tres árboles y una palmera"
			},
			{
				resource: "conjunto-zapatos",
				alt: "conjunto conformado por tres pares de zapatos de mujer y dos pares de zapatos de hombre",
				noSound: true
			},
			{
				resource: "conjunto-numeros",
				alt: "conjunto conformado por los números del uno al siete"
			}
		],
		chances: 3,
		minRightAnswers: 2
	};
});

mat105.controller('Act2Ctrl', function ($scope) {
	$scope.options = {
		data: [
			{
				src1: "conjunto-instrumentos-1",
				alt1: "Conjunto conformado por un tambor, dos maracas, una guitarra eléctrica, una trompeta y un violín",
				src2: "conjunto-instrumentos-2",
				alt2: "conjunto conformado por una pandereta, un xilófono, una batería y una guitarra"
			},
			{
				src1: "conjunto-herramientas-1",
				alt1: "conjunto conformado por un taladro, una motosierra y una segueta eléctrica",
				src2: "conjunto-herramientas-2",
				alt2: "Conjunto conformado por un destornillador, un martillo, una llave, un taladro y un pie de rey"
			},
			{
				src1: "conjunto-balones-1",
				alt1: "conjunto conformado por una bola de bolos, un balón de voleibol, una pelota de tenis y un balón de baloncesto",
				src2: "conjunto-balones-2",
				alt2: "conjunto conformado por una bola de billar, una bola de golf, un balón de baloncesto, un balón de fútbol y una pelota de beisbol"
			}
		],
		minRightAnswers: 2,
		randomItems: true,
		randomTargets: true,
		border: false,
		padding: false
	};
});

mat105.controller('Act3Ctrl', function ($scope) {
	$scope.options = {
		data: [
			{
				src1: "pez",
				alt1: "pez",
				src2: "conjunto-animales-marinos",
				alt2: "conjunto conformado por una tortuga marina, un pez, un cangrejo, una ballena y un tiburón"
			},
			{
				src1: "hamburguesa",
				alt1: "hamburguesa",
				src2: "conjunto-comida-rapida",
				alt2: "Conjunto de comida conformado por una pizza, un perro caliente y un sánduche"
			},
			{
				src1: "camiseta",
				alt1: "camiseta",
				src2: "conjunto-camisetas",
				alt2: "conjunto conformado por dos camisetas de hombre y dos camisetas de mujer"
			}
		],
		minRightAnswers: 2,
		randomItems: true,
		randomTargets: true,
		border: false,
		padding: false
	};
});

mat105.controller('Act4Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: "conjunto-cubiertos",
				alt: "Conjunto conformado por una cuchara, un tenedor y un cuchillo",
				options: [
					{  src: "tenedor", alt: "tenedor", answer: false  },
					{  src: "bombillo", alt: "bombillo", answer: true  }
				]
			},
			{
				src: "conjunto-muebles",
				alt: "Conjunto conformado por una cama, una silla, una mesa para el televisor y un sofá",
				options: [
					{  src: "mueble", alt: "mueble", answer: false  },
					{  src: "tijeras", alt: "tijeras", answer: true  }
				]
			},
			{
				src: "conjunto-mujeres",
				alt: "Conjunto conformado por tres mujeres",
				options: [
					{  src: "hombre", alt: "hombre", answer: true  },
					{  src: "mujer", alt: "mujer", answer: false  }
				]
			}
		],
		minRightAnswers: 2,
		optionsPerRow: 2
	};

});

var appManager = AppManager();
var mat106 = angular.module('mat106', ['activities']);

appManager.configModule(mat106, {
	resources: '../resources/01/mat/06',
	competences1: 'Describo, comparo y cuantifico situaciones con números, en diferentes contextos y con diversas representaciones',
	competences2: 'Establece relaciones de pertenencia y no pertenencia entre los elementos de un conjunto',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia matemáticas lección N° 6”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: '¡Muy bien!, ahora ya identificas si un elemento pertenece o no a un conjunto',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title: 'Agrupo objetos por características iguales'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title: 'Agrupo objetos por características iguales'
		},
		{ 
			name: '/actividad-1-1', 
			templateUrl: 'act1_1', 
			controller: 'Act1_1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-1-2', 
			templateUrl: 'act1_2', 
			controller: 'Act1_2Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2-1', 
			templateUrl: 'act2_1', 
			controller: 'Act2_1Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-2-2', 
			templateUrl: 'act2_2', 
			controller: 'Act2_2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3-1', 
			templateUrl: 'act3_1', 
			controller: 'Act3_1Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-3-2', 
			templateUrl: 'act3_2', 
			controller: 'Act3_2Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title: 'Actividad 4',
		}
	]
});

mat106.controller('Con1Ctrl', function ($scope) {
	$scope.time = [0.2, 2, 1.5];
});

mat106.controller('Con2Ctrl', function ($scope) {
	$scope.time = [0.5, 3.7, 0.6, 0.2, 3.3];
});

mat106.controller('Act1_1Ctrl', function ($scope) {
	$scope.data = {
		sound: 'conjunto-mascotas',
		items: [
			{
				src: "conejo",
				alt: "conejo",
				w: 30, h: 0, t: 39, l: 60
			},
			{
				src: "elefante",
				alt: "elefante",
				answer: false
			},
			{
				src: "ave",
				alt: "ave",
				w: 30, h: 0, t: 50, l: 25
			},
			{
				src: "tigre",
				alt: "tigre",
				answer: false
			},
			{
				src: "perro",
				alt: "perro",
				w: 30, h: 0, t: 8, l: 51,
				startsInGroup: true
			},
			{
				src: "gato",
				alt: "gato",
				w: 30, h: 0, t: 15, l: 14,
				startsInGroup: true
			}
		],
		chances: 2,
		minRightAnswers: 2,
	};
});

mat106.controller('Act1_2Ctrl', function ($scope) {
	$scope.data = {
		sound: 'conjunto-balones',
		items: [
			{
				src: "balon-voleibol",
				alt: "balón de voleibol",
				w: 30, h: 0, t: 64, l: 37
			},
			{
				src: "balon-futbol-americano",
				alt: "balón de fútbol",
				w: 30, h: 0, t: 39, l: 60
			},
			{
				src: "pelota",
				alt: "pelota de playa",
				w: 30, h: 0, t: 46, l: 9
			},
			{
				src: "raqueta",
				alt: "raqueta de tenis",
				answer: false
			},
			{
				src: "balon-baloncesto",
				alt: "balón de baloncesto",
				w: 30, h: 0, t: 8, l: 51,
				startsInGroup: true
			},
			{
				src: "balon-futbol",
				alt: "balón de fútbol",
				w: 30, h: 0, t: 15, l: 14,
				startsInGroup: true
			}
		],
		chances: 3,
		minRightAnswers: 2,
	};
});

mat106.controller('Act2_1Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: "maracas",
				alt: "par de maracas",
				answer: false,
				w: 30, h: 0, t: 4, l: 37
			},
			{
				src: "zanahoria",
				alt: "zanahoria",
				w: 22, h: 0, t: 15, l: 14
			},
			{
				src: "guitarra",
				alt: "guitarra eléctrica",
				answer: false,
				w: 30, h: 0, t: 21, l: 60
			},
			{
				src: "martillo",
				alt: "martillo",
				w: 30, h: 0, t: 51, l: 12
			},
			{
				src: "trompeta",
				alt: "trompeta",
				answer: false,
				w: 42, h: 0, t: 70, l: 42
			}
		],
		chances: 2,
		minRightAnswers: 2,
	};
});

mat106.controller('Act2_2Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: "avion",
				alt: "avión",
				w: 54, h: 0, t: 5, l: 20
			},
			{
				src: "carro",
				alt: "carro familiar de 4 puertas",
				w: 40, h: 0, t: 23, l: 9
			},
			{
				src: "perro-II",
				alt: "perro",
				w: 35, h: 0, t: 32, l: 57
			},
			{
				src: "barco",
				alt: "barco de gran tamaño",
				w: 50, h: 0, t: 55, l: 4
			},
			{
				src: "moto",
				alt: "moto deportiva",
				w: 30, h: 0, t: 59, l: 58
			},
		],
		chances: 1,
		minRightAnswers: 1
	};
});

mat106.controller('Act3_1Ctrl', function ($scope) {
	$scope.data = {
		sound: 'conjunto-cocina',
		items: [
			{
				src: "sarten",
				alt: "sartén",
				w: 49, h: 0, t: 55, l: 33
			},
			{
				src: "tenedor",
				alt: "tenedor",
				w: 40, h: 0, t: 18, l: 60
			},
			{
				src: "computador",
				alt: "computador portátil",
				answer: false
			},
			{
				src: "nevera",
				alt: "nevera",
				w: 51, h: 0, t: 13, l: 4
			},
		],
		chances: 3,
		minRightAnswers: 2,
	};
});

mat106.controller('Act3_2Ctrl', function ($scope) {
	$scope.data = {
		sound: 'conjunto-navidad',
		items: [
			{
				src: "arbol-de-navidad",
				alt: "Árbol de navidad, decorado con bolas, estrellas y bastones",
				w: 40, h: 0, t: 14, l: 7
			},
			{
				src: "bola-de-navidad",
				alt: "Bola decorativa navideña de color rojo",
				w: 33, h: 0, t: 19, l: 57
			},
			{
				src: "pelota-tenis",
				alt: "pelota de tenis",
				answer: false
			},
			{
				src: "papa-noel",
				alt: "Papá Noel cargando una bolsa de tela",
				w: 43, h: 0, t: 52, l: 32
			}
		],
		chances: 3,
		minRightAnswers: 2
	};
});

mat106.controller('Act4Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: "conejo",
				alt: "conejo",
				answer: false,
				w: 30, h: 0, t: 25, l: 3
			},
			{
				src: "elefante",
				alt: "elefante",
				w: 30, h: 0, t: 36, l: 37
			},
			{
				src: "rinoceronte",
				alt: "rinoceronte",
				w: 35, h: 0, t: 56, l: 57
			},
			{
				src: "tigre",
				alt: "tigre",
				w: 30, h: 0, t: 65, l: 19
			},
			{
				src: "perro",
				alt: "perro",
				answer: false,
				w: 30, h: 0, t: 18, l: 63
			},
			{
				src: "gato",
				alt: "gato",
				answer: false,
				w: 30, h: 0, t: 4, l: 37
			}
		],
		chances: 3,
		minRightAnswers: 2,
	};
});

var appManager = AppManager();
var mat107 = angular.module('mat107', ['activities']);

appManager.configModule(mat107, {
	resources: '../resources/01/mat/07',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia matemáticas lección N° 7”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: '¡Muy bien!, has aprendido mucho',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title: 'Vamos a repasar'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title: 'Actividad 4',
		},
		{ 
			name: '/actividad-5', 
			templateUrl: 'act5', 
			controller: 'Act5Ctrl',
			title: 'Actividad 5',
		},
	]
});

mat107.controller('Con1Ctrl', function ($scope) {
	$scope.time = [0.2, 2, 1.5];
});

mat107.controller('Act1Ctrl', function ($scope) {
	$scope.data = {
		groups: [
			{
			sample: { class: 'red-circle' },
			items: [
				{ class: 'red-circle', answer: true },
				{ class: 'blue-triangle' },
				{ class: 'green-square' }
			]
		},
		{
			sample: { class: 'yellow-rectangle' },
			items: [
				{ class: 'yellow-rectangle', answer: true },
				{ class: 'green-square' },
				{ class: 'blue-triangle' }
			]
		},
		{
			sample: { class: 'green-square' },
			items: [
				{ class: 'green-square', answer: true },
				{ class: 'red-circle' },
				{ class: 'yellow-rectangle' }
			]
		},
		{
			sample: { class: 'blue-triangle' },
			items: [
				{ class: 'blue-triangle', answer: true },
				{ class: 'green-square' },
				{ class: 'red-circle' }
			]
		},
		],
		chances: 4,
		minRightAnswers: 3
	};

});

mat107.controller('Act2Ctrl', function ($scope) {
	$scope.data = {
		sound: 'conjunto',
		items: [
			{
			src: "eme",
			alt: "eme minúscula gris",
			answer: false,
			w: 30, h: 0, t: 0, l: 0
		},
		{
			src: "cinco",
			alt: "cinco azul",
			w: 30, h: 0, t: 65, l: 35
		},
		{
			src: "nueve",
			alt: "nueve rojo",
			w: 30, h: 0, t: 17, l: 6
		},
		{
			src: "siete",
			alt: "siete amarillo",
			w: 30, h: 0, t: 15, l: 64
		},
		{
			src: "seis",
			alt: "seis violeta",
			w: 30, h: 0, t: 47, l: 65
		},
		{
			src: "ocho",
			alt: "ocho morado",
			w: 30, h: 0, t: 47, l: 6
		},
		{
			src: "cuatro",
			alt: "cuatro naranja",
			w: 30, h: 0, t: 0, l: 34
		},
		{
			src: "i",
			alt: "i minúscula verde",
			answer: false,
			w: 30, h: 0, t: 0, l: 0
		},
		],
		chances: 6,
		minRightAnswers: 4
	};
});

mat107.controller('Act3Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: "avion",
				alt: "avión"
			},
			{
				src: "carro",
				alt: "carro"
			},
			{
				src: "moto",
				alt: "moto"
			}
		],
		sequence: [0, 1, 2], // Secuencia de elementos en base al index en el array
		spaces: 3, // Espacios a llenar
		minRightAnswers: 2
	};
});

mat107.controller('Act4Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				number: 1,
				src: "flor",
				alt: "flor de color fucsia"
			},
			{
				number: 2,
				src: "hoja",
				alt: "hoja de color verde"
			},
			{
				number: 3,
				src: "naranja",
				alt: "naranja"
			},
			{
				number: 4,
				src: "manzana",
				alt: "manzana roja"
			},
			{
				number: 5,
				src: "estrella",
				alt: "estrella amarilla"
			},
			{
				number: 6,
				src: "corazon",
				alt: "corazón"
			},
			{
				number: 7,
				src: "pera",
				alt: "pera verde"
			},
			{
				number: 8,
				src: "fresa",
				alt: "fresa roja"
			},
			{
				number: 9,
				src: "sol",
				alt: "sol de color amarillo y naranjado"
			}
		],
		minRightAnswers: 5
	};
});

mat107.controller('Act5Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{

				src: "sofa",
				alt: "sofa de color fucsia"
			},
			{
				src: "cama",
				alt: "cama"
			},
			{
				src: "computador",
				alt: "computador"
			},
			{
				src: "nevera",
				alt: "nevera"
			},
			{
				src: "tenedor",
				alt: "tenedor"
			},
			{
				src: "sarten",
				alt: "sartén"
			},
		],
		minRightAnswers: 4
	};
});

var appManager = AppManager();
var nat101 = angular.module('nat101', ['activities']);

appManager.configModule(nat101, {
	resources: '../resources/01/nat/01',
	competences1: 'Describo características de seres vivos y objetos inertes, establezco semejanzas y diferencias entre ellos',
	competences2: 'Identifico seres vivos de mi entorno, siendo capaz de establecer diferencias y semejanzas',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia naturales lección N° 1”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: '¡Felicitaciones amiguito,  ahora reconoces las plantas y los animales!',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title: 'Lección 1: Las plantas y los animales'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title: 'Actividad 4',
		},
	]
});

nat101.controller('Con1Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "plantas",
			alt: "Árbol rodeado por flores y pasto"
		},
		{ 
			resource: "animales",
			alt: "Vaca y caballo comiendo pasto"
		}
	]
});

nat101.controller('Act1Ctrl', function ($scope) {
	$scope.data = {
		data: [
			{
				src: "palmas.png",
				alt: "palmera",
				answer: false
			},
			{
				src: "conejo.png",
				alt: "conejo"
			},
			{
				src: "rosa.png",
				alt: "rosa",
				answer: false
			},
			{
				src: "arbol.png",
				alt: "árbol",
				answer: false
			},
			{
				src: "mariposa.png",
				alt: "mariposa"
			},
			{
				src: "gallina.png",
				alt: "gallina"
			}
		],
		minRightAnswers: 2,
		chances: 3
	};
});

nat101.controller('Act2Ctrl', function ($scope) {
	$scope.data = {
		data: [
			{
				src: "palmas.png",
				alt: "palmera"
			},
			{
				src: "conejo.png",
				alt: "conejo",
				answer: false
			},
			{
				src: "rosa.png",
				alt: "rosa"
			},
			{
				src: "arbol.png",
				alt: "árbol"
			},
			{
				src: "mariposa.png",
				alt: "mariposa",
				answer: false
			},
			{
				src: "gallina.png",
				alt: "gallina",
				answer: false
			}
		],
		minRightAnswers: 2,
		chances: 3
	};
});

nat101.controller('Act3Ctrl', function ($scope) {
	$scope.data = {
		canvas: 'animales-y-plantas',
		targets: [
			{ w: 32, h: 46, t: 13, l: 68 }, // arbol
			{ w: 23, h: 23, t: 6, l: 37 }, // ave arriba 
			{ w: 23, h: 23, t: 21, l: 46 }, // ave abajo
			{ w: 26, h: 37, t: 61, l: 68 }, // flores
			{ w: 25, h: 30, t: 45, l: 48 }, // mariposa
			{ w: 25, h: 50, t: 0, l: 13 }, // palmera atrás
			{ w: 27, h: 81, t: 19, l: 0 }, // palmera adelante
			{ w: 32, h: 50, t: 50, l: 14 }, // ardilla
		],
		minRightAnswers: 5
	};
});

nat101.controller('Act4Ctrl', function ($scope) {
	$scope.data = {
		data: [
			{
				src: "mariposa.png",
				alt: "mariposa",
			},
			{
				src: "araucaria.png",
				alt: "árbol"
			},
			{
				src: "perro.png",
				alt: "perro",
			},
			{
				src: "naranjo.png",
				alt: "naranjo"
			},
			{
				src: "ardilla.png",
				alt: "ardilla"
			},
			{
				src: "rosa.png",
				alt: "rosa",
			}
		],
		priority: true,
		minRightAnswers: 2
	};
});

var appManager = AppManager();
var nat102 = angular.module('nat102', ['activities']);

appManager.configModule(nat102, {
	resources: '../resources/01/nat/02',
	competences1: 'Identifico y describo la flora, la fauna, el agua y el suelo de mi entorno',
	competences2: 'Identifica en su entorno la flora y la fauna, dándole importancia a los elementos naturales',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia naturales lección N° 2”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: '¡Felicitaciones amiguito,  ahora ya sabes más sobre las plantas!',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title: 'Las plantas'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title: 'Las plantas'
		},
		{ 
			name: '/conceptualizacion-3', 
			templateUrl: 'con3', 
			controller: 'Con3Ctrl',
			title: 'Las plantas'
		},
		{ 
			name: '/conceptualizacion-4', 
			templateUrl: 'con4', 
			controller: 'Con4Ctrl',
			title: 'Las plantas'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title: 'Actividad 4',
		},
		{ 
			name: '/actividad-5', 
			templateUrl: 'act5', 
			controller: 'Act5Ctrl',
			title: 'Actividad 5',
		},
	]
});

nat102.controller('Con1Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "agua",
			alt: "Paisaje donde se muestra un río rodeado de vegetación"
		},
		{ 
			resource: "suelo",
			alt: "imagen donde se muestra el suelo y una parte de pasto cubriéndolo por encima"
		},
		{ 
			resource: "luz",
			alt: "imagen que muestra el sol y sus rayos de luz cayendo Sobre un árbol florecido"
		},
		{ 
			resource: "aire",
			alt: "imagen donde se muestra el cielo y el aire en movimiento rozando un árbol"
		}
	]
});

nat102.controller('Con2Ctrl', function ($scope) {
	$scope.data = {
		canvas: 'planta-funciones',
		alt: 'Planta completa, donde se muestra todas las partes de una planta, las hojas, las raíces, el tallo, el fruto, las ramas y las flores',
		items: [
			{
				title: 'Hoja',
				resource: "hoja",
				text: 'Es la parte de la planta que se encarga de la respiración',
				position: { w: 7, t: 0, l: 22 } // Ems
			},
			{
				title: 'Flor',
				resource: "flor",
				text: 'Este órgano tiene como función participar en la reproducción de la planta',
				position: { w: 10.6, t: 5.4, l: 18.4 } // Ems
			},
			{
				title: 'Fruto',
				resource: "fruto",
				text: 'Es el órgano encargado de contener y proteger las semillas',
				position: { w: 18.2, t: 8.7, l: 8.2 } // Ems
			},
			{
				title: 'Tallo',
				resource: "tallo",
				text: 'Tiene como función sostener todos los órganos de la planta',
				position: { w: 16, t: 12, l: 13 } // Ems
			},
			{
				title: 'Raíz',
				resource: "raiz",
				text: 'Es la parte de la planta encargada de obtener los nutrientes del suelo',
				position: { w: 11, t: 18, l: 18 } // Ems
			},
		]

	};
});

nat102.controller('Con3Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "arbol",
			alt: "Árbol de naranjas, rodeado por semillas germinando"
		},
		{ 
			resource: "naranja",
			alt: "naranja"
		},
		{ 
			resource: "semilla",
			alt: "semilla de naranja"
		},
	]
});

nat102.controller('Con4Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				title: "Hierbas",
				src: "hierbas",
				alt: "Hierbas"
			},
			{
				title: "Arbustos",
				src: "arbusto",
				alt: "Arbusto de tamaño pequeño, cuyo tronco se ramifica desde la base"
			},
			{
				title: "Árboles",
				src: "arbol-II",
				alt: "Árbol de gran altura, cuyo tronco se comienza a ramificar muy arriba de la base"
			},
		]
	};
});

nat102.controller('Act1Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: "dulces",
				alt: "dulces",
				answer: false
			},
			{
				src: "luz1",
				alt: "luz",
				answer: true
			},
			{
				src: "agua-II",
				alt: "agua",
				answer: true
			},
			{
				src: "suelo",
				alt: "suelo",
				answer: true
			},
			{
				src: "cama",
				alt: "cama",
				answer: false
			},
			{
				src: "aire1",
				alt: "aire",
				answer: true
			},
		],
		minRightAnswers: 2,
		chances: 4
	};
});

nat102.controller('Act2Ctrl', function ($scope) {
	$scope.data = {
		data: [
			{
				src: "banano.png",
				alt: "banano",
				answer: false
			},
			{
				src: "pinia.png",
				alt: "piña",
				answer: false
			},
			{
				src: "uvas.png",
				alt: "uvas",
				answer: true
			},
			{
				src: "naranja.png",
				alt: "naranja",
				answer: true
			},
			{
				src: "manzana.png",
				alt: "manzana",
				answer: true
			},
			{
				src: "sandia.png",
				alt: "sandía",
				answer: true
			},
		],
		chances: 4,
		minRightAnswers: 3,
		itemsPerRow: 3
	};
});

nat102.controller('Act3Ctrl', function ($scope) {
	$scope.data = {
		canvas: 'planta',
		targets: [
			{ 
				text: "Flor",
				w: 15, h: 15, t: 28, l: 33 
			},
			{ 
				text: "Hoja",
				w: 15, h: 15, t: 29, l: 12 
			},
			{ 
				text: "Fruto",
				w: 15, h: 15, t: 32, l: 65 
			},
			{ 
				text: "Tallo",
				w: 15, h: 15, t: 48, l: 44 
			},
			{ 
				text: "Raíz",
				w: 15, h: 15, t: 69, l: 57 
			},
			{ 
				text: "Rama",
				w: 15, h: 15, t: 24, l: 50 
			},
		],
		minRightAnswers: 4
	};
});

nat102.controller('Act4Ctrl', function ($scope) {
	$scope.options = {
		data: [
			{
				src: "hoja",
				alt: "hoja",
				title: "Respiración"
			},
			{
				src: "fruto",
				alt: "fruto",
				title: "Protección de las semillas"
			},
			{
				src: "tallo",
				alt: "tallo",
				title: "Sostener todos los órganos"
			},
			{
				src: "raices",
				alt: "raíces",
				title: "Obtener los nutrientes"
			},
			{
				src: "flor",
				alt: "flor",
				title: "Reproducción"
			},
		],
		minRightAnswers: 3,
		randomItems: true,
		randomTargets: true,
		padding: false
	};
});

nat102.controller('Act5Ctrl', function ($scope) {
	$scope.options = {
		data: [
			{
				src: "mesa",
				alt: "Mesa",
				title: "Construir Objetos"
			},
			{
				src: "frutas",
				alt: "conjunto de frutas: sandía, piña, manzana, naranja y racimo de uvas",
				title: "Alimentación"
			},
			{
				src: "bebida",
				alt: "Pocillo que contiene una bebida preparada con manzanilla",
				title: "Aliviar un dolor"
			},
			{
				src: "florero",
				alt: "Florero que contiene varias flores de diferentes colores y formas",
				title: "Decorar nuestra casa"
			},
		],
		minRightAnswers: 3,
		randomItems: true,
		randomTargets: true,
		border: false
	};
});


var appManager = AppManager();
var nat103 = angular.module('nat103', ['activities']);

appManager.configModule(nat103, {
	resources: '../resources/01/nat/03',
	competences1: 'Identifico y describo la flora, la fauna, el agua y el suelo de mi entorno',
	competences2: 'Identifica en su entorno la flora y la fauna dándole importancia a los elementos naturales',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia naturales lección N° 3”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: '¡Felicitaciones amiguito,  ahora ya sabes más sobre los animales!',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: function () {},
			title: 'Los animales'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title: 'Los animales'
		},
		{ 
			name: '/conceptualizacion-3', 
			templateUrl: 'con3', 
			controller: 'Con3Ctrl',
			title: 'Los animales'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3'
		},
		{ 
			name: '/actividad-4-1', 
			templateUrl: 'act4_1', 
			controller: 'Act4_1Ctrl',
			title: 'Actividad 4',
		},
		{ 
			name: '/actividad-4-2', 
			templateUrl: 'act4_2', 
			controller: 'Act4_2Ctrl',
			title: 'Actividad 4',
		},
		{ 
			name: '/actividad-4-3', 
			templateUrl: 'act4_3', 
			controller: 'Act4_3Ctrl',
			title: 'Actividad 4',
		},
		{ 
			name: '/actividad-5', 
			templateUrl: 'act5', 
			controller: 'Act5Ctrl',
			title: 'Actividad 5',
		},
	]
});

nat103.controller('Con2Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "oviparos",
			alt: "Gallina con pollitos saliendo de los huevos"
		},
		{ 
			resource: "viviparos",
			alt: "Mujer en embarazo con su hijo al lado"
		},
	]
});

nat103.controller('Con3Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				title: "Acuáticos",
				src: "acuaticos",
				alt: "Pez y tortuga nadando y un cangrejo caminando en el fondo del mar"
			},
			{
				title: "Aéreos",
				src: "aereos",
				alt: "Un búho y un pájaro posados sobre las ramas de un árbol y dos garzas volando"
			},
			{
				title: "Terrestres",
				src: "terrestres",
				alt: "Una jirafa, un león y un mico en la selva"
			},
		]
	};
});

nat103.controller('Act1Ctrl', function ($scope) {
	$scope.data = {
		canvas: 'huevo',
		canvasAlt: 'figura en forma de huevo',
		items: [
			{
				src: "cerdo",
				alt: "cerdo",
				answer: false
			},
			{
				src: "sapo",
				alt: "rana",
				w: 30, h: 0, t: 36, l: 16,
			},
			{
				src: "ave",
				alt: "pájaro",
				w: 44, h: 0, t: 1, l: 27,
			},
			{
				src: "tortuga",
				alt: "tortuga",
				w: 35, h: 0, t: 32, l: 47,
			},
			{
				src: "gallina",
				alt: "gallina",
				w: 40, h: 0, t: 56, l: 30,
			},
			{
				src: "caballo",
				alt: "caballo",
				answer: false
			},
		],
		chances: 4,
		minRightAnswers: 3
	};
});

nat103.controller('Act2Ctrl', function ($scope) {
	$scope.data = {
		canvas: 'circulo',
		canvasAlt: 'figura en forma de círculo',
		items: [
			{
				src: "perro",
				alt: "perro",
				w: 45, h: 0, t: 0, l: 25,
			},
			{
				src: "bebe",
				alt: "bebé",
				w: 45, h: 0, t: 30, l: 0,
			},
			{
				src: "ave",
				alt: "pájaro",
				answer: false
			},
			{
				src: "gallina",
				alt: "gallina",
				answer: false
			},
			{
				src: "cerdo",
				alt: "cerdo",
				w: 45, h: 0, t: 55, l: 26,
			},
			{
				src: "gato",
				alt: "gato",
				w: 45, h: 0, t: 28, l: 56,
			},
		],
		chances: 4,
		minRightAnswers: 3
	};
});

nat103.controller('Act3Ctrl', function ($scope) {
	$scope.data = {
		groups: [
			{
				title: 'Selva',
				resource: 'selva',
				alt: "Selva donde se muestran muchas plantas",
				items: [
					{
						resource: "tigre",
						alt: "tigre"
					},
					{
						resource: "mico",
						alt: "mico"
					},
					{
						resource: "guacamaya",
						alt: "guacamaya"
					},
				]
			},
			{
				title: 'Finca',
				resource: 'finca',
				alt: "finca",
				items: [
					{
						resource: "vaca",
						alt: "vaca"
					},
					{
						resource: "cerdo",
						alt: "cerdo"
					},
					{
						resource: "perro",
						alt: "perro"
					},
				]
			}
		],
		minRightAnswers: 4,
		chances: 6
	};
});

nat103.controller('Act4_1Ctrl', function ($scope) {
	$scope.data = {
		canvas: 'circulo',
		canvasAlt: 'figura en forma de círculo',
		items: [
			{
				src: "perro",
				alt: "perro",
				w: 45, h: 0, t: 7, l: 27,
			},
			{
				src: "ave",
				alt: "pájaro",
				answer: false
			},
			{
				src: "mariposa",
				alt: "mariposa",
				answer: false
			},
			{
				src: "pez",
				alt: "pez",
				answer: false
			},
			{
				src: "pato",
				alt: "pato",
				answer: false
			},
			{
				src: "gato",
				alt: "gato",
				w: 45, h: 0, t: 46, l: 28,
			},
		],
		chances: 2,
		minRightAnswers: 2
	};
});

nat103.controller('Act4_2Ctrl', function ($scope) {
	$scope.data = {
		canvas: 'nube',
		canvasAlt: 'figura en forma de nube',
		items: [
			{
				src: "perro",
				alt: "perro",
				answer: false
			},
			{
				src: "ave",
				alt: "pájaro",
				w: 45, h: 0, t: 34, l: 49,
			},
			{
				src: "mariposa",
				alt: "mariposa",
				w: 45, h: 0, t: 29, l: 8,
			},
			{
				src: "pez",
				alt: "pez",
				answer: false
			},
			{
				src: "pato",
				alt: "pato",
				answer: false
			},
			{
				src: "gato",
				alt: "gato",
				answer: false
			},
		],
		chances: 2,
		minRightAnswers: 2
	};
});

nat103.controller('Act4_3Ctrl', function ($scope) {
	$scope.data = {
		canvas: 'gota-de-agua',
		canvasAlt: 'figura en forma de gota de agua',
		items: [
			{
				src: "perro",
				alt: "perro",
				answer: false
			},
			{
				src: "ave",
				alt: "pájaro",
				answer: false
			},
			{
				src: "mariposa",
				alt: "mariposa",
				answer: false
			},
			{
				src: "pez",
				alt: "pez",
				w: 45, h: 0, t: 54, l: 28,
			},
			{
				src: "pato",
				alt: "pato",
				w: 45, h: 0, t: 17, l: 28,
			},
			{
				src: "gato",
				alt: "gato",
				answer: false
			},
		],
		chances: 2,
		minRightAnswers: 2
	};
});

nat103.controller('Act5Ctrl', function ($scope) {
	$scope.options = {
		data: [
			{
				src1: "vaca",
				alt1: "vaca",
				src2: "leche",
				alt2: "vaso y caja con leche"
			},
			{
				src1: "oveja",
				alt1: "oveja",
				src2: "lana",
				alt2: "lana"
			},
			{
				src1: "caballo-II",
				alt1: "caballo",
				src2: "montar-a-caballo",
				alt2: "señor montando a caballo"
			},
			{
				src1: "perro-II",
				alt1: "perro",
				src2: "senor-con-perro",
				alt2: "señor cargando un perro"
			},
			{
				src1: "gallina",
				alt1: "gallina",
				src2: "huevo-II",
				alt2: "huevo"
			},
		],
		minRightAnswers: 3,
		randomItems: true,
		randomTargets: true
	};
});

var appManager = AppManager();
var nat104 = angular.module('nat104', ['activities']);

appManager.configModule(nat104, {
	resources: '../resources/01/nat/04',
	competences1: 'Identifico y describo la flora, la fauna, el agua y el suelo de mi entorno',
	competences2: 'Identifica en su entorno la flora y la fauna dándole importancia a los elementos naturales',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia naturales lección N° 4”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: '¡Felicitaciones amiguito,  ahora ya sabes más sobre la tierra, la luna y el sol!',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title: 'Mi planeta tierra'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title: 'Mi planeta tierra'
		},
		{ 
			name: '/conceptualizacion-3', 
			templateUrl: 'con3', 
			controller: 'Con3Ctrl',
			title: 'Mi planeta tierra'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title: 'Actividad 4',
		},
		{ 
			name: '/actividad-5', 
			templateUrl: 'act5', 
			controller: 'Act5Ctrl',
			title: 'Actividad 5',
		},
	]
});

nat104.controller('Con1Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "tierra",
			alt: "planeta tierra"
		},
		{ 
			resource: "sol",
			alt: "sol"
		},
		{ 
			resource: "luna",
			alt: "luna"
		}
	]
});

nat104.controller('Con2Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "luna-nueva",
			alt: "Cielo con estrellas donde  la luna no aparece"
		},
		{ 
			resource: "media-luna",
			alt: "Cielo con estrellas donde sólo se muestra una parte de la luna"
		},
		{ 
			resource: "luna-llena",
			alt: "Cielo con estrellas donde aparece la luna Completa, con su forma circular"
		}
	]
});

nat104.controller('Con2Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "luna-nueva",
			alt: "Cielo con estrellas donde  la luna no aparece"
		},
		{ 
			resource: "media-luna",
			alt: "Cielo con estrellas donde sólo se muestra una parte de la luna"
		},
		{ 
			resource: "luna-llena",
			alt: "Cielo con estrellas donde aparece la luna Completa, con su forma circular"
		}
	]
});

nat104.controller('Con3Ctrl', function ($scope) {
	$scope.data = {
		canvas: 'planetas',
		canvasAlt: 'Imagen donde se muestra el sol y los nueve planetas girando alrededor de él',
		targets: [
			{ w: 10, h: 54, t: 26, l: 21, src: "mercurio" },
			{ w: 9, h: 61, t: 26, l: 31, src: "venus" },
			{ w: 9, h: 61, t: 22, l: 40, src: "tierra" },
			{ w: 8, h: 61, t: 26, l: 49, src: "marte" },
			{ w: 8, h: 56, t: 22, l: 57, src: "jupiter" },
			{ w: 11, h: 79, t: 12, l: 65, src: "saturno" },
			{ w: 7, h: 58, t: 33, l: 76, src: "urano" },
			{ w: 9, h: 60, t: 20, l: 83, src: "neptuno" },
			{ w: 8, h: 57, t: 34, l: 92, src: "pluton" },
		]
	};
});

nat104.controller('Act1Ctrl', function ($scope) {
	$scope.data = {
		// Cada respuesta debe tener un Id único, que es usado para definir las respuestas de cada item
		answers: [
			// Día
			{
				id: 1,
				src: "sol-II",
				alt: "sol"
			},
			// Noche
			{
				id: 2,
				src: "luna-II",
				alt: "luna"
			},
		],
		items: [
			{
				src: "oficio",
				alt: "Niña trapeando",
				answers: [1, 2]
			},
			{
				src: "banarse",
				alt: "Niño bañándose",
				answers: [1, 2]
			},
			{
				src: "jugar",
				alt: "Niño y niña Jugando con un balón",
				answers: [1, 2]
			},
			{
				src: "cepillarse-los-dientes",
				alt: "Niña cepillándose los dientes",
				answers: [1, 2]
			},
			{
				src: "estudiar",
				alt: "Niño estudiando",
				answers: [1, 2]
			},
			{
				src: "dormir",
				alt: "Niño durmiendo en su cama",
				answers: [2]
			},
		],
		chances: 6,
		minRightAnswers: 4	
	};
});

nat104.controller('Act2Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: "bebe",
				alt: "bebé",
				answer: true	
			},
			{
				src: "arbol",
				alt: "árbol",
				answer: true	
			},
			{
				src: "piedra",
				alt: "tres piedras",
				answer: false	
			},
			{
				src: "pajaro",
				alt: "pájaro",
				answer: true	
			},
		],
		minRightAnswers: 2,
		chances: 3
	};
});

nat104.controller('Act3Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				resource: "media-luna",
				alt: "Cielo con estrellas donde sólo se muestra una parte de la luna"
			},
			{
				resource: "luna-llena",
				alt: "Cielo con estrellas donde aparece la luna completa, con su forma circular"
			},
			{
				resource: "luna-nueva",
				alt: "Cielo con estrellas donde  la luna no aparece"
			}
		],
		chances: 3,
		minRightAnswers: 2
	};
});

nat104.controller('Act4Ctrl', function ($scope) {
	$scope.data = {
		canvas: 'sin-planetas',
		canvasAlt: 'Imagen del espacio donde aparecen el sol y las orbitas donde se ubican los planetas',
		sample: 'planetas',
		sampleAlt: 'Imagen donde se muestra el sol y los nueve planetas girando alrededor de él',
		targets: [
			{ 
				src: "mercurio",
				targetPos: { w: 10, h: 100, t: 0, l: 21 },
				innerPos: { w: 175, h: 54, t: 52, l: -30 }
			},
			{ 
				src: "venus",
				targetPos: { w: 8, h: 100, t: 0, l: 31 },
				innerPos: { w: 228, h: 61, t: 62.4, l: -55 }
			},
			{ 
				src: "tierra-III",
				alt: "tierra",
				targetPos: { w: 8, h: 100, t: 0, l: 39 },
				innerPos: { w: 203, h: 62, t: 62.3, l: -41 }
			},
			{ 
				src: "marte",
				targetPos: { w: 8, h: 100, t: 0, l: 47 },
				innerPos: { w: 215, h: 61, t: 63, l: -44 }
			},
			{ 
				src: "jupiter",
				alt: "júpiter",
				targetPos: { w: 9, h: 100, t: 0, l: 55 },
				innerPos: { w: 200, h: 56, t: 50, l: -35 }
			},
			{ 
				src: "saturno",
				targetPos: { w: 9, h: 100, t: 0, l: 64 },
				innerPos: { w: 181, h: 79, t: 38, l: -35 }
			},
			{ 
				src: "urano",
				targetPos: { w: 9, h: 100, t: 0, l: 73 },
				innerPos: { w: 204, h: 58, t: 51, l: -42 }
			},
			{ 
				src: "neptuno",
				targetPos: { w: 10, h: 100, t: 0, l: 82 },
				innerPos: { w: 175, h: 59, t: 45, l: -42 }
			},
			{ 
				src: "pluton",
				alt: "plutón",
				targetPos: { w: 8, h: 100, t: 0, l: 92 },
				innerPos: { w: 236, h: 57, t: 59, l: -77 }
			}
		],
		rightAnswerCallback: function (item) {
			$('#audio-' + item.src)[0].play();
		},
		minRightAnswers: 5,
		itemsContainerHeight: '112px'
	};
});

nat104.controller('Act5Ctrl', function ($scope) {
	$scope.data = {
		canvas: 'sin-planetas',
		canvasAlt: 'Imagen del espacio donde aparecen el sol y las orbitas donde se ubican los planetas',
		targets: [
			{ 
				src: "mercurio",
				targetPos: { w: 10, h: 100, t: 0, l: 21 },
				innerPos: { w: 175, h: 54, t: 52, l: -30 }
			},
			{ 
				src: "venus",
				targetPos: { w: 8, h: 100, t: 0, l: 31 },
				innerPos: { w: 228, h: 61, t: 62.4, l: -55 }
			},
			{ 
				src: "tierra-III",
				alt: "tierra",
				targetPos: { w: 8, h: 100, t: 0, l: 39 },
				innerPos: { w: 203, h: 62, t: 62.3, l: -41 }
			},
			{ 
				src: "marte",
				targetPos: { w: 8, h: 100, t: 0, l: 47 },
				innerPos: { w: 215, h: 61, t: 63, l: -44 }
			},
			{ 
				src: "jupiter",
				alt: "júpiter",
				targetPos: { w: 9, h: 100, t: 0, l: 55 },
				innerPos: { w: 200, h: 56, t: 50, l: -35 }
			},
			{ 
				src: "saturno",
				targetPos: { w: 9, h: 100, t: 0, l: 64 },
				innerPos: { w: 181, h: 79, t: 38, l: -35 }
			},
			{ 
				src: "urano",
				targetPos: { w: 9, h: 100, t: 0, l: 73 },
				innerPos: { w: 204, h: 58, t: 51, l: -42 }
			},
			{ 
				src: "neptuno",
				targetPos: { w: 10, h: 100, t: 0, l: 82 },
				innerPos: { w: 175, h: 59, t: 45, l: -42 }
			},
			{ 
				src: "pluton",
				alt: "plutón",
				targetPos: { w: 8, h: 100, t: 0, l: 92 },
				innerPos: { w: 236, h: 57, t: 59, l: -77 }
			}
		],
		rightAnswerCallback: function (item) {
			$('#audio-' + item.src)[0].play();
		},
		minRightAnswers: 5,
		itemsContainerHeight: '112px'
	};
});


var appManager = AppManager();
var nat105 = angular.module('nat105', ['activities']);

appManager.configModule(nat105, {
	resources: '../resources/01/nat/05',
	competences1: 'Propongo y verifico diversas formas de medir sólidos y líquidos',
	competences2: 'Propone y verifica las diferentes formas que existen para medir las propiedades de los elementos',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia naturales lección N° 5”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: '¡Felicitaciones amiguito,  ahora ya sabes más sobre las propiedades de los objetos!',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title: 'Las propiedades de los objetos'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title: 'Las propiedades de los objetos'
		},
		{ 
			name: '/conceptualizacion-3', 
			templateUrl: 'con3', 
			controller: 'Con3Ctrl',
			title: 'Las propiedades de los objetos'
		},
		{ 
			name: '/conceptualizacion-4', 
			templateUrl: 'con4', 
			controller: 'Con4Ctrl',
			title: 'Las propiedades de los objetos'
		},
		{ 
			name: '/conceptualizacion-5', 
			templateUrl: 'con5', 
			controller: 'Con5Ctrl',
			title: 'Las propiedades de los objetos'
		},
		{ 
			name: '/actividad-1-1', 
			templateUrl: 'act1_1', 
			controller: 'Act1_1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-1-2', 
			templateUrl: 'act1_2', 
			controller: 'Act1_2Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-1-3', 
			templateUrl: 'act1_3', 
			controller: 'Act1_3Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title: 'Actividad 4',
		}
	]
});

nat105.controller('Con1Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				title: "Rectángulo",
				customClass: "figure rectangle",
				src: "rectangulo",
				alt: "Cuadro de flores con forma de rectángulo"
			},
			{
				title: "Círculo",
				customClass: "figure circle",
				src: "circulo",
				alt: "Reloj de pared con forma de círculo"
			},
			{
				title: "Cuadrado",
				customClass: "figure square",
				src: "cuadrado",
				alt: "Hojas de colores con forma de cuadro"
			},
			{
				title: "Triángulo",
				customClass: "figure triangle",
				src: "triangulo",
				alt: "Regla en forma de triángulo"
			}
		]
	};
});

nat105.controller('Con2Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "nevera",
			text: "Nevera",
			audio: "grande",
			alt: "Nevera"
		},
		{ 
			resource: "computador-II",
			text: "Computador portátil",
			audio: "pequeno",
			alt: "computador portátil"
		},
	]
});

nat105.controller('Con3Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "hoja",
			text: "Hoja de papel",
			audio: "liso",
			alt: "hoja de papel"
		},
		{ 
			resource: "madera-II",
			text: "Tabla de madera",
			audio: "aspero",
			alt: "tabla de madera"
		}
	]
});

nat105.controller('Con4Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "ladrillo",
			text: "Ladrillo",
			audio: "pesado",
			alt: "ladrillo"
		},
		{ 
			resource: "pluma",
			text: "Pluma",
			audio: "liviano",
			alt: "pluma"
		},
	]
});

nat105.controller('Con5Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "piedra",
			text: "Piedra",
			audio: "duro",
			alt: "piedra"
		},
		{ 
			resource: "pan",
			text: "Pan tajado",
			audio: "blando",
			alt: "pan tajado"
		},
	]
});

nat105.controller('Act1_1Ctrl', function ($scope) {
	$scope.data = {
		// Importante: no cambiar las posiciones. Las figuras se identifican con el index
		pos: [
			// triángulo naranja
			{ x: 745, y: 10, rot: -90 },
			// triángulo verde
			{ x: 30, y: 10, rot: -90 },
			// Romboide morado
			{ x: 493, y: 10, rot: 135 },
			// triángulo amarillo
			{ x: 620, y: 10, rot: 0 },
			// cuadro rojo
			{ x: 260, y: 10, rot: 0 },
			// triángulo azul 1
			{ x: 160, y: 10, rot: 90 },
			// triángulo azul 2
			{ x: 380, y: 10, rot: 0 }
		],
		figure: [
			// triángulo naranja
			{ x: 105, y: 0, rot: -90 },
			// triángulo verde
			{ x: 65, y: 100, rot: -90 },
			// Romboide morado
			{ x: 6, y: 14, rot: 135 },
			// triángulo amarillo
			{ x: 0, y: 85, rot: 0 },
			// cuadro rojo
			{ x: 41, y: -57, rot: 0 },
			// triángulo azul 1
			{ x: 140, y: 100, rot: 90 },
			// triángulo azul 2
			{ x: 115, y: 75, rot: 0 }
		],
		color: '#009500',
		name: 'Casa',
		chances: 8
	};
});

nat105.controller('Act1_2Ctrl', function ($scope) {
	$scope.data = {
		// Importante: no cambiar las posiciones. Las figuras se identifican con el index
		pos: [
			// triángulo naranja
			{ x: 745, y: -30, rot: -135 },
			// triángulo verde
			{ x: 30, y: 25, rot: 45 },
			// Romboide morado
			{ x: 493, y: -5, rot: 90 },
			// triángulo amarillo
			{ x: 620, y: -5, rot: 90 },
			// cuadro rojo
			{ x: 245, y: 10, rot: 45 },
			// triángulo azul 1
			{ x: 125, y: 10, rot: 90 },
			// triángulo azul 2
			{ x: 380, y: 10, rot: 0 }
		],
		figure: [
			// triángulo naranja
			{ x: 19, y: 43, rot: -135 },
			// triángulo verde
			{ x: 140, y: 64, rot: 45 },
			// Romboide morado
			{ x: -41, y: 83, rot: 90 },
			// triángulo amarillo
			{ x: 140, y: 135, rot: 90 },
			// cuadro rojo
			{ x: 150, y: -68, rot: 45 },
			// triángulo azul 1
			{ x: 9, y: 150, rot: 90 },
			// triángulo azul 2
			{ x: 200, y: -93, rot: 0 }
		],
		color: '#009500',
		name: 'Perro',
		chances: 10
	};
});

nat105.controller('Act1_3Ctrl', function ($scope) {
	$scope.data = {
		// Importante: no cambiar las posiciones. Las figuras se identifican con el index
		pos: [
			// triángulo naranja
			{ x: 745, y: 30, rot: 135 },
			// triángulo verde
			{ x: 30, y: 10, rot: 90 },
			// Romboide morado
			{ x: 513, y: 5, rot: 90, scale: { x: -1, y: 1 } },
			// triángulo amarillo
			{ x: 640, y: 5, rot: -45 },
			// cuadro rojo
			{ x: 290, y: 10, rot: 45 },
			// triángulo azul 1
			{ x: 190, y: 10, rot: -90 },
			// triángulo azul 2
			{ x: 420, y: 10, rot: -45 }
		],
		figure: [
			// triángulo naranja
			{ x: 65, y: 160, rot: 135 },
			// triángulo verde
			{ x: 130, y: 104, rot: 90 },
			// Romboide morado
			{ x: 36, y: -51, rot: 90, scale: { x: -1, y: 1 } },
			// triángulo amarillo
			{ x: 9, y: 125, rot: -45 },
			// cuadro rojo
			{ x: 11, y: 23, rot: 45 },
			// triángulo azul 1
			{ x: -15, y: 73, rot: -90 },
			// triángulo azul 2
			{ x: -7, y: -73, rot: -45 }
		],
		color: '#009500',
		name: 'Cisne',
		chances: 10
	};
});

nat105.controller('Act2Ctrl', function ($scope) {
	$scope.data = {
		groups: [
			{
				title: 'Baúl',
				resource: "baul",
				alt: "baúl",
				items: [
					{
						resource: "reloj",
						alt: "reloj de mano"
					},
					{
						resource: "anillo",
						alt: "anillo"
					},
					{
						resource: "gorra",
						alt: "gorra"
					},
				]
			},
			{
				title: 'Casa',
				resource: "casa",
				alt: "casa",
				items: [
					{
						resource: "televisor",
						alt: "televisor"
					},
					{
						resource: "estufa",
						alt: "estufa"
					},
					{
						resource: "nevera",
						alt: "nevera"
					},
				]
			}
		],
		minRightAnswers: 4,
		chances: 6
	};
});

nat105.controller('Act3Ctrl', function ($scope) {
	$scope.data = {
		groupImg: "camion",
		groupAlt: "camión",
		data: [
			{
				src: "sofa.png",
				alt: "Mueble de dos puestos",
			},
			{
				src: "ladrillos.png",
				alt: "Tres ladrillos, uno encima del otro"
			},
			{
				src: "peluche.png",
				alt: "Oso de peluche",
				answer: false
			},
			{
				src: "cojines-rosa.png",
				alt: "Dos cojines",
				answer: false
			},
			{
				src: "nevera.png",
				alt: "nevera"
			},
			{
				src: "cemento.png",
				alt: "Cuatro bultos de cemento"
			}
		],
		minRightAnswers: 3,
		chances: 4
	};
});

nat105.controller('Act4Ctrl', function ($scope) {
	$scope.data = {
		groups: [
			{
				title: "Liso",
				numInputs: 3
			},
			{
				title: "Áspero",
				numInputs: 3
			},
			{
				title: "Duro",
				numInputs: 3
			},
			{
				title: "Blando",
				numInputs: 3
			}
		]
	};
});

var appManager = AppManager();
var nat106 = angular.module('nat106', ['activities']);

appManager.configModule(nat106, {
	resources: '../resources/01/nat/06',
	competences1: 'Identifico diferentes estados físicos de la materia (el agua, por ejemplo) y verifico causas para su cambio de estado.',
	competences2: 'Identifica los diferentes estados físicos de la materia descubriendo su causa.',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia naturales lección N° 6”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados.',
	farewell: '¡Felicitaciones amiguito,  ahora ya sabes más sobre la materia y sus estados!',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title: 'Lección 6: La materia'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1 | Lección 6'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title: 'Actividad 4',
		},
		{ 
			name: '/actividad-5', 
			templateUrl: 'act5', 
			controller: 'Act5Ctrl',
			title: 'Actividad 5',
		}
	]
});

nat106.controller('Con1Ctrl', function ($scope) {
	$scope.data = {
    items: [
      {
        title: "Líquido",
        number: "1",
        img: "jugo.png",
    	imgAlt: "Vaso con jugo en su interior",
        text: "Los líquidos no tienen forma definida, sino que se adaptan a la forma del recipiente que los Contiene. Algunos ejemplos son: el jugo, el agua, la gaseosa y la sopa",
        imgstyle: "border-radius: 50%;border: solid #009500;"
      },
      {
        title: "Sólido",
        number: "2",
        img: "ladrillos.png",
    	imgAlt: "tres ladrillos , uno encima del otro",
        text: "Los sólidos tienen forma definida, se caracterizan por ser duros y resistentes. Algunos ejemplos son: los ladrillos, la madera y las piedras.",
        imgstyle: "border-radius: 50%;border: solid #009500;"
      },
      {
        title: "Gaseoso",
        number: "3",
        img: "globos.png",
    	imgAlt: "Cinco globos de colores",
        text: "La materia en estado gaseoso no tiene forma definida, ella tiende a escaparse del recipiente que la contiene. Algunos ejemplos son: el aire en los globos y el gas en las pipetas.",
        imgstyle: "border-radius: 50%;border: solid #009500;"
      }
    ]
  }
});

nat106.controller('Act1Ctrl', function ($scope) {
	$scope.options = {
		data: [
			{
				src1: "jugo2",
				alt1: "Gaseosa de naranja",
				src2: "botella",
				alt2: "Envase de gaseosa"
			},
			{
				src1: "agua",
				alt1: "agua",
				src2: "vaso",
				alt2: "Vaso con agua"
			},
			{
				src1: "leche",
				alt1: "Leche",
				src2: "tetero",
				alt2: "Tetero"
			},
			{
				src1: "pintura",
				alt1: "pintura color rojo",
				src2: "bote",
				alt2: "tarro de pintura"
			}
		],
		minRightAnswers: 3,
		
	};
});

nat106.controller('Act2Ctrl', function ($scope) {
	$scope.options = {
		data: [
			{
				src1: "mesa",
				alt1: "Mesa",
				src2: "mesa",
				alt2: "Mesa"
			},
			{
				src1: "pina",
				alt1: "Piña",
				src2: "pina",
				alt2: "Piña"
			},
			{
				src1: "mueble",
				alt1: "Mueble",
				src2: "mueble",
				alt2: "Mueble"
			},
			{
				src1: "lapiz",
				alt1: "Lapiz",
				src2: "lapiz",
				alt2: "Lapiz"
			},
			{
				src1: "nevera",
				alt1: "Nevera",
				src2: "nevera",
				alt2: "Nevera"
			},
			{
				src1: "libro",
				alt1: "Libro",
				src2: "libro",
				alt2: "Libro"
			}
		],
		minRightAnswers: 3,
	};
});

nat106.controller('Act3Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: 'estufa',
				alt: 'Tres papeleras empleadas para el  reciclaje',
				title:"Estufa",
				answer: true	
			},
			{
				src: 'equipo',
				alt: 'una mujer sembrando una planta',
				title:"Equipo de sonido",
				answer: false	
			},
			{
				src: 'carro',
				alt: 'Una lata de gaseosa sobre la arena de la playa',
				title:"Carro",
				answer: true	
			},
			{
				src: 'candela',
				alt: 'una señora depositando la basura en la basurera',
				title:"Candela",
				answer: true	
			},
			{
				src: 'calentador',
				alt: 'una señora depositando la basura en la basurera',
				title:"Calentador",
				answer: true	
			},
			{
				src: 'silla',
				alt: 'Varias bolsas de basura arrojadas sobre la calle',
				title:"Silla",
				answer: false	
			}
		],
		minRightAnswers: 3,
		chances: 4,
		itemsfloat: true
	};
});

nat106.controller('Act4Ctrl', function ($scope) {
	$scope.data = {
    chancesPerItem: 1,
    extension: '.png',
    itemsPerRow: 3,
    descriptionTop: true,
    randomItems: true,
    minRightAnswers: 3,
    data: [
      {
        resource: "manzana",
        alt: "Manzana",
        correctAnswer: "Sólido"
      },
      {
        resource: "botelladeagua",
        alt: "Botella con agua",
        correctAnswer: "Líquido"
      },
      {
        resource: "vapor",
        alt: "olla con vapor saliendo de su interior",
        correctAnswer: "Gaseoso"
      },  
    ]
  };

});

nat106.controller('Act5Ctrl', function ($scope) {
	$scope.data = {
		groups: [
			{
				title: "Sólido",
				numInputs: 3
			},
			{
				title: "Líquido",
				numInputs: 3
			},
			{
				title: "Gaseoso",
				numInputs: 3
			}
			
		]
	};
});

var appManager = AppManager();
var nat107 = angular.module('nat107', ['activities']);

appManager.configModule(nat107, {
	resources: '../resources/01/nat/07',
	competences1: 'Identifico diferentes estados físicos de la materia (el agua, por ejemplo) y verifico causas para su cambio de estado.',
	competences2: 'Identifica los diferentes estados físicos de la materia descubriendo su causa.',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia naturales lección N° 7”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados.',
	farewell: '¡Felicitaciones amiguito,  ahora ya sabes más sobre el agua, la materia y sus estados!',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title: 'Lección 7: El agua'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title: 'Lección 7: El agua'
		},
		{ 
			name: '/conceptualizacion-3', 
			templateUrl: 'con3', 
			controller: 'Con3Ctrl',
			title: 'Lección 7: El agua'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1 | Lección 7'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2 | Lección 7'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3 | Lección 7',
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title: 'Actividad 4 | Lección 7',
		},
		{ 
			name: '/actividad-5', 
			templateUrl: 'act5', 
			controller: 'Act5Ctrl',
			title: 'Actividad 5 | Lección 7',
		},
		{ 
			name: '/actividad-6', 
			templateUrl: 'act6', 
			controller: 'Act6Ctrl',
			title: 'Actividad 6 | Lección 7',
		}
	]
});

nat107.controller('Con1Ctrl', function ($scope) {
	$scope.data = [
		{
			resource: 'rio',
		},
		{
			resource: 'mar',
		},
		{
			resource: 'lago',
		}
	];
});

nat107.controller('Con2Ctrl', function ($scope) {
  $scope.$root.isNextEnabled = false; // Activamos el siguiente link

  $scope.isCompleted = false
	$scope.itemclick = [];


  $scope.$root.verify = function (item) { 
  	
  	if($scope.itemclick.indexOf(item) === -1){

  		$scope.itemclick += item
	}
           
  	if($scope.itemclick.length >= 3){
  		$scope.$root.isNextEnabled = true; // Activamos el siguiente link
  	}

  };

});

nat107.controller('Con3Ctrl', function ($scope) {
  $scope.$root.isNextEnabled = false; // Activamos el siguiente link

  $scope.isCompleted = false
	$scope.itemclick = [];


  $scope.$root.verify = function (item) { 
  	
  	if($scope.itemclick.indexOf(item) === -1){

  		$scope.itemclick += item
	}
           
  	if($scope.itemclick.length >= 4){
  		$scope.$root.isNextEnabled = true; // Activamos el siguiente link
  	}

  };

});

nat107.controller('Act1Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: 'vaso',
				alt: 'Tres papeleras empleadas para el  reciclaje',
				answer: true	
			},
			{
				src: 'edificios',
				alt: 'una mujer sembrando una planta',
				answer: false	
			},
			{
				src: 'cubo2',
				alt: 'Una lata de gaseosa sobre la arena de la playa',
				answer: true	
			},
			{
				src: 'paisaje',
				alt: 'una señora depositando la basura en la basurera',
				answer: false	
			},
			{
				src: 'lluvia',
				alt: 'una señora depositando la basura en la basurera',
				title:"Calentador",
				answer: true	
			},
			{
				src: 'rio',
				alt: 'Varias bolsas de basura arrojadas sobre la calle',
				answer: true	
			}
		],
		minRightAnswers: 3,
		chances: 4,
		itemsfloat: true
	};
});

nat107.controller('Act2Ctrl', function ($scope) {
	$scope.data = {
    chancesPerItem: 1,
    extension: '.png',
    itemsPerRow: 3,
    randomItems: true,
    hideDescription: true,
    minRightAnswers: 2,
    data: [
      {
        resource: "lago",
        alt: "Lago rodeado por plantas y dos patos nadando sobre él",
        correctAnswer: "líquido"
      },
      {
        resource: "cubos",
        alt: "Tres cubos de hielo",
        correctAnswer: "sólido"
      },
      {
        resource: "gaseoso",
        alt: "Humo saliendo de una olla",
        correctAnswer: "gaseoso"
      },  
    ]
  };
});

nat107.controller('Act3Ctrl', function ($scope) {
	$scope.data = {
		groupImg: "congelador",
		groupAlt: "Nevera abierta",
		data: [
			{
				src: "cono.png",
				alt: "Helado",
			},
			{
				src: "paleta.png",
				alt: "paleta"
			},
			{
				src: "manzana.png",
				alt: "manzana",
				answer: false
			},
			{
				src: "pan.png",
				alt: "Pan tajado",
				answer: false
			},
			{
				src: "cubos.png",
				alt: "tres cubos de hielo"
			},
			{
				src: "bolis.png",
				alt: "bolis"
			}
		],
		minRightAnswers: 3,
		chances: 4
	};
});

nat107.controller('Act4Ctrl', function ($scope) {
	$scope.data = {
		groupImg: "fogon2",
		groupAlt: "Olla sobre un fogón",
		data: [
			{
				src: "chocolate.png",
				alt: "Barras de chocolate",
			},
			{
				src: "manzana.png",
				alt: "manzana",
				answer: false
			},
			{
				src: "vela.png",
				alt: "vela",
			},
			{
				src: "cubos.png",
				alt: "tres cubos de hielo"
			},
			{
				src: "paleta.png",
				alt: "paleta"
			},
			{
				src: "tabla.png",
				alt: "tabla de madera",
				answer: false
			}
		],
		minRightAnswers: 3,
		chances: 4
	};
});

nat107.controller('Act5Ctrl', function ($scope) {
	$scope.items = [
			{ 				
				img: 'llave.png',
				altimg: 'Llave del agua abierta',
				w: 300, h: 470, t:2	, l:0,
				options: [
		          { text: "Cerrar la llave cuando no la utilicemos.", answer: true },
		          { text: "Dejar la llave abierta."},
		        ]
			},
			{ 	
				img: 'banarse.png',
				altimg: 'Niño bañándose',
				w: 300, h: 470, t:2	, l:35,
				options: [
		          { text: "Tomar un baño corto.", answer: true },
		          { text: "Tomar un baño largo con la ducha abierta."},
		        ]
			},
			{ 				
				img: 'cepillarse.png',
				altimg: 'Niña cepillándose los dientes',
				w: 300, h: 470, t:2	, l:70,
				options: [
		          { text: "Cerrar la llave del agua mientras te cepillas.", answer: true },
		          { text: "Deja abierta la llave del agua mientras te cepillas."},
		        ]
			}
		],

		$scope.options = {
			items: $scope.items,
			canvasStyle: 'width: 100%;height: 500px;',
			chances: 1,
			optionsrandom: true,
			minRightAnswers: 2,
			itemsPerRow : 3,
			selectindividual: true
		};
});

nat107.controller('Act6Ctrl', function ($scope) {
	$scope.items = [
			{ 				
				img: 'cubos.png',
				title:'¿Si dejas varias horas por fuera del congelador, algunos cubos de hielo a qué estado pasarán?',
				altimg: 'Llave del agua abierta',
				w: 300, h: 520, t:2	, l:0,
				options: [
		          { text: "Sólido" },
		          { text: "Líquido", answer: true},
		        ]
			},
			{ 	
				img: 'fogon2.png',
				title: '¿Si dejas varias horas en el fogón una olla con agua, a qué estado pasará el agua?',
				altimg: 'Niño bañándose',
				w: 300, h: 520, t:2	, l:35,
				options: [
		          { text: "Gaseoso", answer: true },
		          { text: "Líquido"},
		        ]
			},
			{ 				
				img: 'jugo.png',
				title: '¿Si dejas en el congelador de un día para otro un vaso con jugo, a qué estado pasará el jugo?',
				altimg: 'Niña cepillándose los dientes',
				w: 300, h: 520, t:2	, l:70,
				options: [
		          { text: "Líquido"},
		          { text: "Sólido", answer: true },
		        ]
			}
		],

		$scope.options = {
			items: $scope.items,
			canvasStyle: 'width: 100%;height: 570px;',
			chances: 1,
			optionsrandom: true,
			minRightAnswers: 2,
			itemsPerRow : 3,
			selectindividual: true
		};
});

var appManager = AppManager();
var soc101 = angular.module('soc101', ['activities']);

appManager.configModule(soc101, {
	resources: '../resources/01/soc/01',
	competences1:'Reconozco y respeto diferentes puntos de vista',
	competences2:'Ubicarse en el entorno o medio en el que vive, expresando cómo lo puede cuidar y conservar',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia sociales lección N° 1”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: 'Muy bien amiguito, ahora ya sabes como cuidar y conservar tu entorno',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: function () {},
			title: 'Lección 1: Ayudo a cuidar y conservar mi entorno'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title: 'Lección 1: Ayudo a cuidar y conservar mi entorno'
		},
		{ 
			name: '/conceptualizacion-3', 
			templateUrl: 'con3', 
			controller: 'Con3Ctrl',
			title: 'Lección 1: Ayudo a cuidar y conservar mi entorno'
		},
		{ 
			name: '/conceptualizacion-4', 
			templateUrl: 'con4', 
			controller: 'Con4Ctrl',
			title: 'Lección 1: Ayudo a cuidar y conservar mi entorno'
		},
		{ 
			name: '/conceptualizacion-5', 
			templateUrl: 'con5', 
			controller: 'Con5Ctrl',
			title: 'Lección 1: Ayudo a cuidar y conservar mi entorno'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-4-1', 
			templateUrl: 'act4_1', 
			controller: 'Act4_1Ctrl',
			title: 'Actividad 4',
		},
		{ 
			name: '/actividad-4-2', 
			templateUrl: 'act4_2', 
			controller: 'Act4_2Ctrl',
			title: 'Actividad 4',
		}
	]
});

soc101.controller('Con2Ctrl', function ($scope) {
	$scope.data = [

		{ 
			resource: "limpiar",
			alt: "Niña sacudiendo el televisor"
		},
		{ 
			resource: "organizar" ,
			alt: "Niño organizando su escritorio" 
		}
	]
});

soc101.controller('Con3Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "llave",
			alt: "Llave de agua, con un chorro de agua saliendo por ella",
			alt2: "Llave de agua cerrada"
		}
	]
});

soc101.controller('Con4Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "televisor",
			alt: "Televisor encendido",
			alt2: "televisor apagado"
		},
		{ 
			resource: "bombillo",
			alt: "bombillo encendido",
			alt2: "bombillo apagado"
		}
	]
});

soc101.controller('Con5Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "basura1",
			alt: "Niño recogiendo la basura del piso y arrojándola en la papelera"
		}
	]
});

soc101.controller('Act1Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: 'reciclar',
				alt: 'Tres papeleras empleadas para el  reciclaje',
				title: "Cardoso, R. (2007). Recycle 1 [Fotografía]. Obtenido de: http://www.sxc.hu/photo/736425",
				answer: true	
			},
			{
				src: 'plantar',
				alt: 'una mujer sembrando una planta',
				title: "Roveri, R. (2005). Planting [Fotografía]. Obtenido de: http://www.sxc.hu/photo/428778",
				answer: true	
			},
			{
				src: 'lata',
				alt: 'Una lata de gaseosa sobre la arena de la playa',
				title: "Cristian G. (2008). Can u see it? [Fotografía]. Obtenido de: http://www.sxc.hu/photo/967434",
				answer: false	
			},
			{
				src: 'basura2',
				alt: 'una señora depositando la basura en la basurera',
				title: "Gjenero S. (2008). Keep it clean [Fotografía]. Obtenido de: http://www.sxc.hu/photo/1109269",
				answer: true	
			},
			{
				src: 'chimenea',
				alt: 'una señora depositando la basura en la basurera',
				title: "Richert C. & Richert M. (2012). Industrial smokestack [Fotografía]. Obtenido de: http://www.sxc.hu/photo/1401832",
				answer: false	
			},
			{
				src: 'basura3',
				alt: 'Varias bolsas de basura arrojadas sobre la calle',
				title: "Lis J. (2005). Garbage 2 [Fotografía]. Obtenido de: http://www.sxc.hu/browse.phtml?f=view&id=348617",
				answer: false	
			}
		],
		minRightAnswers: 2,
		chances: 3
	};
});

soc101.controller('Act2Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: 'tender-cama',
				alt: 'Niño tendiendo su cama',
				answer: true	
			},
			{
				src: 'recoger-juguetes',
				alt: 'Niña recogiendo y guardando sus juguetes, después de jugar',
				answer: true	
			},
			{
				src: 'desordenar',
				alt: 'Niño desordenando su escritorio',
				answer: false	
			}
		],
		minRightAnswers: 2,
		chances: 2
	};
});

soc101.controller('Act3Ctrl', function ($scope) {
	$scope.data = {
		groups: [
			{
				title: 'Basura',
				resource: 'basura',
				alt: "Caneca de la basura",
				items: [
					{
						resource: 'manzana',
						alt: "Desperdicio de una manzana"
					},
					{
						resource: 'caja_vacia',
						alt: "Caja y envase vacíos"
					}
				]
			},
			{
				title: 'Escritorio',
				resource: 'escritorio',
				alt: "escritorio",
				items: [
					{
						resource: 'computador',
						alt: "Computador"
					},
					{
						resource: 'lapiz',
						alt: "Lápiz"
					},
					{
						resource: 'libro',
						alt: "Un libro de pasta naranjada"
					}
				]
			}
		],
		minRightAnswers: 3,
		chances: 5

	};
});

soc101.controller('Act4_1Ctrl', function ($scope) {
	// Obtenemos el audio deseado
	var source = '<audio id="audio-contaminacion" preload="auto">' +
					"<source src=\"" + $scope.resources + "/contaminacion.mp3\" type=\"audio/mpeg\">" +
				'</audio>';

	$('#main-container').append(source);

	$scope.data = {
		data: [
			{
				src: 'reciclar.jpg',
				alt: 'Tres papeleras empleadas para el  reciclaje',
				title: "Cardoso, R. (2007). Recycle 1 [Fotografía]. Obtenido de: http://www.sxc.hu/photo/736425",
				answer: false
			},
			{
				src: 'plantar.jpg',
				alt: 'Una mujer sembrando una planta',
				title: "Roveri, R. (2005). Planting [Fotografía]. Obtenido de: http://www.sxc.hu/photo/428778",
				answer: false
			},
			{
				src: 'chimenea.jpg',
				alt: 'La chimenea de una fábrica arrojando humo al aire libre',
				title: "Richert C. & Richert M. (2012). Industrial smokestack [Fotografía]. Obtenido de: http://www.sxc.hu/photo/1401832",
				answer: true
			},
			{
				src: 'cigarrillos.jpg',
				alt: 'Varias colillas de cigarrillo',
				title: "Jac L. (2005). Cigarettes [Fotografía]. Obtenido de: http://www.sxc.hu/photo/330326",
				answer: true
			},
			{
				src: 'botella.jpg',
				alt: 'Una botella plástica arrojada sobre la manga',
				title: "Kiser K. (2004). Litter Bug 4 [Fotografía]. Obtenido de: http://www.sxc.hu/photo/115166",
				answer: true
			},
			{
				src: 'papelera.jpg',
				alt: 'Una papelera',
				title: "Pebley G. (2008). File_13 [Fotografía]. Obtenido de: http://www.sxc.hu/photo/1020163",
				answer: false
			}
		],
		minRightAnswers: 2,
		chances: 3,
		rightAnswerCallback: function (item) {
			// Reproducimos el audio
			$('#audio-contaminacion')[0].play();	
		}
	};
});

soc101.controller('Act4_2Ctrl', function ($scope) {

	// Obtenemos el audio deseado
	var source = '<audio id="audio-proteccion" preload="auto">' +
					"<source src=\"" + $scope.resources + "/proteccion.mp3\" type=\"audio/mpeg\">" +
				'</audio>';

	$('#main-container').append(source);

	$scope.data = {
		data: [
			{
				src: 'reciclar.jpg',
				alt: 'Tres papeleras empleadas para el  reciclaje',
				title: "Cardoso, R. (2007). Recycle 1 [Fotografía]. Obtenido de: http://www.sxc.hu/photo/736425",
				answer: true
			},
			{
				src: 'plantar.jpg',
				alt: 'Una mujer sembrando una planta',
				title: "Roveri, R. (2005). Planting [Fotografía]. Obtenido de: http://www.sxc.hu/photo/428778",
				answer: true
			},
			{
				src: 'chimenea.jpg',
				alt: 'La chimenea de una fábrica arrojando humo al aire libre',
				title: "Richert C. & Richert M. (2012). Industrial smokestack [Fotografía]. Obtenido de: http://www.sxc.hu/photo/1401832",
				answer: false
			},
			{
				src: 'cigarrillos.jpg',
				alt: 'Varias colillas de cigarrillo',
				title: "Jac L. (2005). Cigarettes [Fotografía]. Obtenido de: http://www.sxc.hu/photo/330326",
				answer: false
			},
			{
				src: 'botella.jpg',
				alt: 'Una botella plástica arrojada sobre la manga',
				title: "Kiser K. (2004). Litter Bug 4 [Fotografía]. Obtenido de: http://www.sxc.hu/photo/115166",
				answer: false
			},
			{
				src: 'papelera.jpg',
				alt: 'Una papelera',
				title: "Pebley G. (2008). File_13 [Fotografía]. Obtenido de: http://www.sxc.hu/photo/1020163",
				answer: true
			}
		],
		minRightAnswers: 2,
		chances: 3,
		rightAnswerCallback: function (item) {
			// Reproducimos el audio
			$('#audio-proteccion')[0].play();	
		}
	};
});

var appManager = AppManager();
var soc102 = angular.module('soc102', ['activities']);

appManager.configModule(soc102, {
	resources: '../resources/01/soc/02',
	farewell: 'Muy bien amiguito ahora ya sabes como tener una buena convivencia',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia sociales lección N° 2”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	competences1: 'Reconozco y respeto diferentes puntos de vista',
	competences2: 'Describir su entorno familiar e identificar normas, autoridades y sus funciones, para desarrollar valores cívicos y hábitos de convivencia',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: function () {},
			title: 'Las normas de convivencia'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title: 'Las normas de convivencia'
		},
		{ 
			name: '/conceptualizacion-3', 
			templateUrl: 'con3', 
			controller: 'Con3Ctrl',
			title: 'Las normas de convivencia'
		},
		{ 
			name: '/conceptualizacion-4', 
			templateUrl: 'con4', 
			controller: 'Con4Ctrl',
			title: 'Las normas de convivencia'
		},
		{ 
			name: '/conceptualizacion-5', 
			templateUrl: 'con5', 
			controller: 'Con5Ctrl',
			title: 'Las normas de convivencia'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3',
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title: 'Actividad 4',
		}
	]
});

soc102.controller('Con2Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "saludar",
			alt: "Niña moviendo su mano, saludando"
		},
		{ 
			resource: "despedirse",
			alt: "Una niña despidiéndose de un niño"
		},
		{ 
			resource: "dar-las-gracias",
			alt: "Un niño con su mano derecha en el pecho, en señal de agradecimiento"
		},
		{ 
			resource: "pedir-el-favor",
			alt: "Una niña hablando con un niño, pidiéndole un favor"
		}
	]
});

soc102.controller('Con3Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "escuchar",
			alt: "Una niña con una mano detrás de su oreja en señal de escucha"
		},
		{ 
			resource: "pedir-permiso",
			alt: "Un niño hablando con una niña pidiéndole permiso para tomar su juguete"
		},
		{ 
			resource: "pedir-perdon",
			alt: "Un niño con su mano derecha en el pecho y con cara triste, pidiendo perdón"
		},
		{ 
			resource: "no-gritar",
			alt: "Un niño con su boca abierta, gritando fuertemente"
		}
	];
});

soc102.controller('Con4Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "no-pegar",
			alt: "Un niño pegándole una patada a otro"
		},
		{ 
			resource: "no-escupir",
			alt: "Un niño escupiendo a otro"
		},
		{ 
			resource: "no-robar",
			alt: "Un señor tomando sin permiso la billetera del bolso de una señora"
		},
		{ 
			resource: "adultos",
			alt: "Una mujer y un hombre mayores"
		}
	];
});

soc102.controller('Con5Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "arrojar-basuras",
			text: "No arrojar basuras al piso",
			alt: "Un niño arrojando la basura a la papelera"
		},
		{ 
			resource: "escuchar-musica",
			text: "Escuchar música a bajo volumen",
			alt: "Una niña escuchando música"
		}
	];
});

soc102.controller('Act1Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				resource: "no-gritar",
				alt: "Un niño con su boca abierta, gritando fuertemente",
				answer: false
			},
			{
				resource: "saludar",
				alt: "Niña moviendo su mano, saludando",
				answer: true
			},
			{
				resource: "compartir",
				alt: "Niña compartiendo un dulce con un niño",
				answer: true
			},
			{
				resource: "dar-la-mano",
				alt: "Niño y niña dándose la mano en señal de agrado",
				answer: true
			},
			{
				resource: "escuchar",
				alt: "Una niña con una mano detrás de su oreja en señal de escucha",
				answer: true
			},
			{
				resource: "no-pegar",
				alt: "Un niño pegándole una patada a otro",
				answer: false
			},
		],
		minRightAnswers: 4	
	};
});

soc102.controller('Act2Ctrl', function ($scope) {
	$scope.data = {
		data: [
			{
				src: "orden.png",
				alt: "Dos niños compartiendo felices y en armonía en su salón de clases",
				answer: true
			},
			{
				src: "desorden.png",
				alt: "Dos niños peleando y ocasionando desorden en su salón de clases",
				answer: false
			}
		],
		chances: 1,
		minRightAnswers: 1,
		itemsPerRow: 2
	};
});

soc102.controller('Act3Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				resource: "pedir-el-favor",
				alt: "Una niña hablando con un niño, pidiéndole un favor"
			},
			{
				resource: "saludar",
				alt: "Niña moviendo su mano, saludando"
			},
			{
				resource: "compartir",
				alt: "Niña compartiendo un dulce con un niño"
			},
			{
				resource: "dar-la-mano",
				alt: "Niño y niña dándose la mano en señal de agradecimiento"
			}
		],
		minRightAnswers: 3
	};
});

soc102.controller('Act4Ctrl', function ($scope) {
	$scope.data = {
		data: [
			{
				src: "arrojar-basuras-2.png",
				alt: "Un niño arrojando la basura a la papelera",
				answer: true
			},
			{
				src: "compartir-2.png",
				alt: "Niña compartiendo un dulce con un niño",
				answer: true
			},
			{
				src: "dar-la-mano-2.png",
				alt: "Niño y niña dándose la mano en señal de agradecimiento",
				answer: true
			},
			{
				src: "no-gritar-2.png",
				alt: "No gritar",
				answer: true
			},
			{
				src: "no-robar-2.png",
				alt: "No tomar las cosas ajenas, sin pedir permiso",
				answer: true
			},
			{
				src: "saludar-2.png",
				alt: "Niña moviendo su mano, saludando",
				answer: true
			}
		],
		chances: 3,
		minRightAnswers: 3
	};
});

var appManager = AppManager();
var soc103 = angular.module('soc103', ['activities']);

appManager.configModule(soc103, {
	resources: '../resources/01/soc/03',
	competences1:'Reconozco y describo las características físicas de las principales formas del paisaje',
	competences2:'Identifica las principales características y formas del paisaje',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia sociales lección N° 3”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados.',
	farewell: 'Felicitaciones, ya conoces la diferencia entre paisajes naturales y artificiales',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: function(){},
			title: 'El paisaje y sus elementos'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title: 'El paisaje y sus elementos'
		},
		{ 
			name: '/conceptualizacion-3', 
			templateUrl: 'con3', 
			controller: 'Con3Ctrl',
			title: 'El paisaje y sus elementos'
		},
		{ 
			name: '/conceptualizacion-4', 
			templateUrl: 'con4', 
			controller: 'Con4Ctrl',
			title: 'El paisaje y sus elementos'
		},
		{ 
			name: '/conceptualizacion-5', 
			templateUrl: 'con5', 
			controller: 'Con5Ctrl',
			title: 'El paisaje y sus elementos'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3',
			
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title: 'Actividad 4',
			
		},
		{ 
			name: '/actividad-5', 
			templateUrl: 'act5', 
			controller: 'Act5Ctrl',
			title: 'Actividad 5',
			
		}
	]
});

soc103.controller('Con2Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "montanias",
			alt: "Paisaje conformado por dos montañas grandes, el cielo y el sol"
		},
		{ 
			resource: "arboles",
			alt: "Paisaje conformado por el cielo, cuatro árboles y pasto"
		},
		{ 
			resource: "animales",
			alt: "Elefante, cebra, tigre y rinoceronte caminando por el campo"
		}
	]
});

soc103.controller('Con3Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "rio",
			alt: "Paisaje conformado por un río rodeado de mucha vegetación"
		},
		{ 
			resource: "mar",
			alt: "Paisaje conformado por el cielo, el mar, la arena de la playa y las palmeras"
		}
	]
});

soc103.controller('Con4Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "edificios",
			alt: "Paisaje conformado por tres edificios altos, varios árboles y una carretera",
		},
		{ 
			resource: "casas",
			alt: "Paisaje conformado por el cielo, el pasto y dos casas"
		},
		{ 
			resource: "carros",
			alt: "Paisaje donde se muestra dos carros desplazándose por una carretera"
		}
	]
});

soc103.controller('Con5Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "carreteras",
			alt: "Paisaje conformado por una larga carretera, rodeada por árboles y un carro desplazándose por ella"
		},
		{ 
			resource: "puente",
			alt: "Paisaje donde se muestra  un puente muy largo que va por encima de un río y que comunica con una ciudad"
		}
	]
});

soc103.controller('Act1Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: "arcoiris",
				alt: "Arco iris" ,
				z: 2, t: -11, l: -26, w: 53
			},
			{
				src: "arbol-I",
				alt: "árbol de forma redondeada" ,
				z: 2, t: 5, l: -22, w: 88
			},
			{
				src: "arbol-II",
				alt: "Árbol de forma triangular" ,
				z: 2, t: 4, l: 44, w: 56
			},
			{
				src: "sol",
				alt: "sol" ,
				z: 2, t: -9, l: 45, w: 30
			},
			{
				src: "mariposa",
				alt: "Mariposa" ,
				z: 2, t: 48, l: 28, w: 45
			},
			{
				src: "base-montaje-elementos-nat",
				alt: "río rodeado por vegetación" ,
				z: 1 , t: 0, l: 0, w: 100
			}
		],
		minRightAnswers: 6,
		chances: 6
	};
});

soc103.controller('Act2Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: "edificio",
				alt: "Edificio de varios pisos" ,
				z: 2, t: 2, l: 29, w: 54
			},
			{
				src: "casa",
				alt: "casa" ,
				z: 2, t: 22, l: -2, w: 44
			},
			{
				src: "arbol-I",
				alt: "árbol" ,
				answer: false
			},
			{
				src: "base-montaje-elementos-artif",
				alt: "Carretera rodeada por vegetación y edificios" ,
				z: 1, t: 0, l: 0, w: 100
			},
			{
				src: "camioneta",
				alt: "Camioneta de color rojo" ,
				z: 2, t: 41, l: 21, w: 51
			},
			{
				src: "base-montaje-elementos-nat",
				alt: "Río rodeado por vegetación" ,
				answer: false
			}
		],
		minRightAnswers: 3,
		chances: 4
	};
});

soc103.controller('Act3Ctrl', function ($scope) {
	$scope.data = {
		canvas: 'seleccion-artificial',
		targets: [
			{ w: 46, h: 71, t: 29, l: 54 },
			{ w: 25, h: 25, t: 8, l: 0 },
			{ w: 20, h: 23, t: 10, l: 34 },
			{ w: 23, h: 23, t: 77, l: 17 },
			{ w: 25, h: 28, t: 44, l: 0 },
			{ w: 19, h: 18, t: 34, l: 33 }
		],
		minRightAnswers: 4
	};
});

soc103.controller('Act4Ctrl', function ($scope) {
	$scope.data = {
		image: 'rompecabezas-ciudad',
		rows: 2, cols: 2,
		chances: 4,
		minRightAnswers: 4
	};
});

soc103.controller('Act5Ctrl', function ($scope) {
	$scope.data = {
		image: 'rompecabezas-campo',
		rows: 2, cols: 2,
		chances: 4,
		minRightAnswers: 4
	};
});

var appManager = AppManager();
var soc104 = angular.module('soc104', ['activities']);

appManager.configModule(soc104, {
	resources: '../resources/01/soc/04',
	competences1:'Reconozco, describo y comparo las actividades económicas de algunas personas en mi entorno y el efecto de su trabajo en la comunidad',
	competences2:'Identifico algunas profesiones y oficios propios de mi entorno social y cultural',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia sociales lección N° 4”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: '¡Felicitaciones!, ya conoces la diferencia entre profesiones y oficios',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title: 'Las profesiones y los oficios'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title: 'Las profesiones y los oficios'
		},
		{ 
			name: '/conceptualizacion-3', 
			templateUrl: 'con3', 
			controller: 'Con3Ctrl',
			title: 'Las profesiones y los oficios'
		},
		{ 
			name: '/conceptualizacion-4', 
			templateUrl: 'con4', 
			controller: 'Con4Ctrl',
			title: 'Las profesiones y los oficios'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3'
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title: 'Actividad 4',
		},
		{ 
			name: '/actividad-5', 
			templateUrl: 'act5', 
			controller: 'Act5Ctrl',
			title: 'Actividad 5',
		}
	]
});

soc104.controller('Con1Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "medico",
			alt: "Médico con un tarro de medicinas en su mano"
		},
		{ 
			resource: "profesor",
			alt: "Profesor enseñando las vocales en el tablero"
		},
		{ 
			resource: "enfermera",
			alt: "Enfermera con una pastilla en su mano"
		}
	]
});

soc104.controller('Con2Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "odontologo",
			alt: "Odontóloga con aparato odontológico en su mano"
		},
		{ 
			resource: "sacerdote",
			alt: "Sacerdote"
		},
		{ 
			resource: "arquitecto",
			alt: "Arquitecto con casco, sujetando en su mano varios planos"
		}
	]
});

soc104.controller('Con3Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "conductor",
			alt: "Señor manejando un taxi"
		},
		{ 
			resource: "bombero",
			alt: "Bombero con extintor a un lado"
		},
		{ 
			resource: "panadero",
			alt: "Panadero con un rodillo en sus manos"
		}
	]
});

soc104.controller('Con4Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "tendero",
			alt: "Tendero ofreciendo sus productos"
		},
		{ 
			resource: "carpintero",
			alt: "Carpintero con un serrucho y un martillo en sus manos"
		},
		{ 
			resource: "carnicero",
			alt: "Carnicero con delantal y un trozo de carne en una de sus manos"
		}
	]
});

soc104.controller('Act1Ctrl', function ($scope) {
	$scope.options = {
		data: [
			{
				src1: "profesor",
				alt1: "Profesor enseñando las vocales en el tablero",
				src2: "tablero",
				alt2: "Tablero"
			},
			{
				src1: "cocinero",
				alt1: "Chef con un pollo asado en sus manos",
				src2: "ollas",
				alt2: "Cucharón, olla y sartén"
			},
			{
				src1: "bombero",
				alt1: "Bombero con extintor a un lado",
				src2: "extintor",
				alt2: "Extintor"
			},
			{
				src1: "medico",
				alt1: "Médico con un tarro de medicinas en su mano",
				src2: "herramienta1",
				alt2: "Aparato usado por los médicos para oír los sonidos internos del cuerpo humano"
			}
		],
		minRightAnswers: 3,
		randomItems: true,
		randomTargets: true
	};
});

soc104.controller('Act2Ctrl', function ($scope) {
	// Obtenemos el audio deseado
	var source = '<audio id="audio-oficio" preload="auto">' +
					"<source src=\"" + $scope.resources + "/oficio.mp3\" type=\"audio/mpeg\">" +
				'</audio>';

	$('#main-container').append(source);

	$scope.data = {
		data: [
			{
				src: "arquitecto.png",
				alt: "Arquitecto con casco, sujetando en su mano varios planos",
				answer: false
			},
			{
				src: "panadero.png",
				alt: "Panadero con un rodillo en sus manos"
			},
			{
				src: "cirujano.png",
				alt: "Médico con una jeringa en su mano",
				answer: false
			},
			{
				src: "odontologo.png",
				alt: "Odontóloga con aparato odontológico en su mano",
				answer: false
			},
			{
				src: "pintor.png",
				alt: "Pintor con una brocha en su mano"
			},
			{
				src: "conductor.png",
				alt: "Conductor manejando un taxi"
			}
		],
		minRightAnswers: 2,
		chances: 3,
		rightAnswerCallback: function (item) {
			// Reproducimos el audio
			$('#audio-oficio')[0].play();	
		}
	};
});

soc104.controller('Act3Ctrl', function ($scope) {
	// Obtenemos el audio deseado
	var source = '<audio id="audio-profesion" preload="auto">' +
					"<source src=\"" + $scope.resources + "/profesion.mp3\" type=\"audio/mpeg\">" +
				'</audio>';

	$('#main-container').append(source);

	$scope.data = {
		data: [
			{
				src: "arquitecto.png",
				alt: "Arquitecto con casco, sujetando en su mano varios planos"
			},
			{
				src: "panadero.png",
				alt: "Panadero con un rodillo en sus manos",
				answer: false
			},
			{
				src: "cirujano.png",
				alt: "Médico con una jeringa en su mano"
			},
			{
				src: "odontologo.png",
				alt: "Odontóloga con aparato odontológico en su mano"
			},
			{
				src: "pintor.png",
				alt: "Pintor con una brocha en su mano",
				answer: false
			},
			{
				src: "conductor.png",
				alt: "Conductor manejando un taxi",
				answer: false
			}
		],
		minRightAnswers: 2,
		chances: 3,
		rightAnswerCallback: function (item) {
			// Reproducimos el audio
			$('#audio-profesion')[0].play();	
		}
	};
});

soc104.controller('Act4Ctrl', function ($scope) {

	$scope.data = {
		data: [
			{
				src: "panadero.png",
				alt: "Panadero con un rodillo en sus manos"
			},
			{
				src: "enfermera.png",
				alt: "Enfermera con una pastilla en su mano"
			},
			{
				src: "tendero.png",
				alt: "Tendero ofreciendo sus productos"
			},
			{
				src: "profesor.png",
				alt: "Profesor enseñando las vocales en el tablero"
			},
			{
				src: "pintor.png",
				alt: "Pintor con una brocha en su mano"
			},
			{
				src: "carpintero.png",
				alt: "Carpintero con un serrucho y un martillo en sus manos"
			},
			{
				src: "medico.png",
				alt: "Médico con un tarro de medicinas en su mano"
			}
		],
		minRightAnswers: 4,
		itemsPerRow: 4,
		priority: true
	};

});

soc104.controller('Act5Ctrl', function ($scope) {

	$scope.data = {
		data: [
			{
				src: "medico.png",
				alt: "Médico con un tarro de medicinas en su mano"
			},
			{
				src: "arquitecto.png",
				alt: "Arquitecto con casco, sujetando en su mano varios planos"
			},
			{
				src: "profesor.png",
				alt: "Profesor enseñando las vocales en el tablero"
			},
			{
				src: "bombero.png",
				alt: "Bombero con extintor a un lado"
			},
			{
				src: "policia.png",
				alt: "Policía"
			},
			{
				src: "cocinero.png",
				alt: "Chef con un pollo asado en sus manos"
			},
			{
				src: "odontologo.png",
				alt: "Odontóloga con aparato odontológico en su mano"
			}
		],
		minRightAnswers: 2,
		itemsPerRow: 4,
		priority: true
	};

});


var appManager = AppManager();
var soc105 = angular.module('soc105', ['activities']);

appManager.configModule(soc105, {
	resources: '../resources/01/soc/05',
	competences1:'Identifico los principales recursos naturales (renovables y no renovables)',
	competences2:'Reconoce los recursos renovables y no renovables y los asocia con su medio físico',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia sociales lección N° 5”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: 'Muy bien, ahora a cuidar los recursos naturales',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title: 'Recursos renovables y no renovables'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title: 'Recursos renovables y no renovables'
		},
		{ 
			name: '/conceptualizacion-3', 
			templateUrl: 'con3', 
			controller: 'Con3Ctrl',
			title: 'Recursos renovables y no renovables'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3'
		},
		{ 
			name: '/actividad-4', 
			templateUrl: 'act4', 
			controller: 'Act4Ctrl',
			title: 'Actividad 4',
		},
		{ 
			name: '/actividad-5', 
			templateUrl: 'act5', 
			controller: 'Act5Ctrl',
			title: 'Actividad 5',
		}
	]
});

soc105.controller('Con1Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "plantas",
			alt: "Paisaje que presenta dos árboles, pasto y flores"
		},
		{ 
			resource: "animales",
			alt: "imagen con un perro, un gato y una mariposa"
		},
		{ 
			resource: "suelo",
			alt: "imagen donde se muestra el suelo y una parte de pasto cubriéndolo por encima"
		}
	]
});

soc105.controller('Con2Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "agua",
			alt: "Paisaje donde se muestra un río rodeado de vegetación"
		},
		{ 
			resource: "aire",
			alt: "imagen donde se muestra el cielo y el aire en movimiento"
		}
	]
});

soc105.controller('Con3Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "oro",
			alt: "Tres lingotes de oro"
		},
		{ 
			resource: "petroleo",
			alt: "una gota de petróleo"
		},
		{ 
			resource: "carbon",
			alt: "Dos trozos de carbón"
		}
	]
});

soc105.controller('Act1Ctrl', function ($scope) {

	$scope.data = {
		data: [
			{
				src: "agua.png",
				alt: "Paisaje donde se muestra un río rodeado de vegetación"
			},
			{
				src: "aire.png",
				alt: "imagen donde se muestra el cielo y el aire en movimiento"
			},
			{
				src: "oro-II.png",
				alt: "tres lingotes de oro",
				answer: false
			},
			{
				src: "petroleo-II.png",
				alt: "una gota de petróleo",
				answer: false
			},
			{
				src: "animales-II.png",
				alt: "un gato"
			},
			{
				src: "plantas-II.png",
				alt: "paisaje con un árbol florecido y pasto a su alrededor"
			},
			{
				src: "suelo.png",
				alt: "imagen donde se muestra el suelo y una parte de pasto cubriéndolo por encima"
			},
			{
				src: "carbon-II.png",
				alt: "dos trozos de carbón",
				answer: false
			}
		],
		chances: 5,
		minRightAnswers: 3,
		itemsPerRow: 4
	};

});

soc105.controller('Act2Ctrl', function ($scope) {

	$scope.data = {
		data: [
			{
				src: "agua.png",
				alt: "Paisaje donde se muestra un río rodeado de vegetación",
				answer: false
			},
			{
				src: "aire.png",
				alt: "imagen donde se muestra el cielo y el aire en movimiento",
				answer: false
			},
			{
				src: "oro-II.png",
				alt: "tres lingotes de oro"
			},
			{
				src: "petroleo-II.png",
				alt: "una gota de petróleo"
			},
			{
				src: "animales-II.png",
				alt: "un gato",
				answer: false
			},
			{
				src: "plantas-II.png",
				alt: "paisaje con un árbol florecido y pasto a su alrededor",
				answer: false
			},
			{
				src: "suelo.png",
				alt: "imagen donde se muestra el suelo y una parte de pasto cubriéndolo por encima",
				answer: false
			},
			{
				src: "carbon-II.png",
				alt: "dos trozos de carbón"
			}
		],
		chances: 3,
		minRightAnswers: 2,
		itemsPerRow: 4
	};

});

soc105.controller('Act3Ctrl', function ($scope) {

	$scope.options = {
		data: [
			{
				src1: "agua-III",
				alt1: "Una gota de agua",
				src2: "beber-agua",
				alt2: "un señor tomando un vaso con agua"
			},
			{
				src1: "arbol",
				alt1: "un árbol",
				src2: "frutas",
				alt2: "tres frutas: una manzana, una pera y una naranja"
			},
			{
				src1: "oro",
				alt1: "tres lingotes de oro",
				src2: "anillos",
				alt2: "dos anillos de oro"
			},
			{
				src1: "petroleo",
				alt1: "una gota de petróleo",
				src2: "carro",
				alt2: "Un señor manejando un carro"
			}
		],
		minRightAnswers: 3,
		randomItems: true,
		randomTargets: true
	};
});

soc105.controller('Act4Ctrl', function ($scope) {
	$scope.data = {
		canvas: 'actividad',
		targets: [
			{ w: 30, h: 41, t: 0, l: 70 },
			{ w: 100, h: 28, t: 0, l: 0 },
			{ w: 19, h: 25, t: 21, l: 51 },
			{ w: 33, h: 45, t: 17, l: 0 },
			{ w: 44, h: 38, t: 41, l: 12 },
			{ w: 29, h: 28, t: 72, l: 71 }
		],
		minRightAnswers: 4
	};

});

soc105.controller('Act5Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: "canilla",
				alt: "Llave de agua abierta",
				options: [
					{  text: "Cerrar la llave cuando no la utilicemos", answer: true  },
					{  text: "Mantener la llave abierta", answer: false  }
				]
			},
			{
				src: "sembrar",
				alt: "niña sembrando una planta en el jardín",
				options: [
					{  text: "Dañar las plantas", answer: false  },
					{  text: "Sembrar plantas", answer: true  }
				]
			},
			{
				src: "bombillo",
				alt: "Bombillo",
				options: [
					{  text: "Apagar las luces que no necesitemos", answer: true  },
					{  text: "Prender todas las luces de la casa", answer: false  }
				]
			}
		],
		minRightAnswers: 2
	};

});

var appManager = AppManager();
var soc106 = angular.module('soc106', ['activities']);

appManager.configModule(soc106, {
	resources: '../resources/01/soc/06',
	competences1:'Cuido mi cuerpo y mis relaciones con los demás',
	competences2:'Realiza acciones de autocuidado con su cuerpo aplicándolas en su vida diaria',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia sociales lección N° 6”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: 'Muy bien, ahora ya sabes como cuidar tu cuerpo',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: 'Con1Ctrl',
			title: 'Cuido mi cuerpo'
		},
		{ 
			name: '/conceptualizacion-2', 
			templateUrl: 'con2', 
			controller: 'Con2Ctrl',
			title: 'Cuido mi cuerpo'
		},
		{ 
			name: '/conceptualizacion-3', 
			templateUrl: 'con3', 
			controller: 'Con3Ctrl',
			title: 'Cuido mi cuerpo'
		},
		{ 
			name: '/conceptualizacion-4', 
			templateUrl: 'con4', 
			controller: 'Con4Ctrl',
			title: 'Cuido mi cuerpo'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3', 
			templateUrl: 'act3', 
			controller: 'Act3Ctrl',
			title: 'Actividad 3'
		},
	]
});

soc106.controller('Con1Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "banarse",
			alt: "Niño bañándose"
		}
	]
});

soc106.controller('Con2Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "lavar-dientes",
			alt: "Niña lavándose los dientes"
		}
	]
});

soc106.controller('Con3Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "jugar",
			alt: "Niño en silla de ruedas y niña jugando con un balón"
		}
	]
});

soc106.controller('Con4Ctrl', function ($scope) {
	$scope.data = [
		{ 
			resource: "dormir",
			alt: "Niño acostado en su cama durmiendo"
		}
	]
});

soc106.controller('Act1Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				src: "lavar-dientes",
				alt: "Niña lavándose los dientes",
				answer: true
			},
			{
				src: "banarse",
				alt: "Niño bañándose",
				answer: true
			},
			{
				src: "nina-comiendo",
				alt: "Niña comiendo con las manos sucias",
				answer: false
			},
			{
				src: "lavarse-las-manos",
				alt: "Niño lavándose las manos en el lavamanos",
				answer: true
			}
		],
		minRightAnswers: 2,
		chances: 3
	};
});

soc106.controller('Act2Ctrl', function ($scope) {
	$scope.options = {
		data: [
			{
				src1: "manos",
				alt1: "Manos",
				src2: "lavarse-las-manos",
				alt2: "Niño lavándose las manos en el lavamanos"
			},
			{
				src1: "dientes",
				alt1: "boca abierta donde se pueden ver los dientes y la lengua",
				src2: "lavar-dientes",
				alt2: "Niña lavándose los dientes"
			},
			{
				src1: "pie",
				alt1: "pie",
				src2: "cortar-unas",
				alt2: "Mujer cortándose las uñas de los pies con el cortauñas"
			}
		],
		minRightAnswers: 2,
		randomItems: true,
		randomTargets: true,
		rightAnswerCallback: function (item) {
			// Buscamos el elemento de audio y lo reproducimos	
			$('#audio-' + item.src2)[0].play();
		}
	};
});

soc106.controller('Act3Ctrl', function ($scope) {
	$scope.data = {
		items: [
			{
				resource: "peinarse",
				alt: "Niña peinándose el cabello con una peinilla"
			},
			{
				resource: "lavarse-las-manos",
				alt: "Niño lavándose las manos en el lavamanos"
			},
			{
				resource: "lavar-dientes",
				alt: "Niña lavándose los dientes"
			},
			{
				resource: "banarse",
				alt: "Niño bañándose"
			}
		],
		minRightAnswers: 3
	};
});

var appManager = AppManager();
var soc107 = angular.module('soc107', ['activities']);

appManager.configModule(soc107, {
	resources: '../resources/01/soc/07',
	competences1:'Identifico los principales recursos naturales (renovables y no renovables)',
	competences2:'Reconoce los recursos renovables y no renovables y los asocia con su medio físico',
	evidences: 'Ingresar al curso “Primaria incluyente”, seleccionar la herramienta actividades, hacer clic sobre el nombre “Actividades de evidencia sociales lección N° 7”, descargar y realizar la actividad propuesta, y enviarla al facilitador por esta misma herramienta en los tiempos programados',
	farewell: '¡Felicitaciones!, has aprendido mucho',
	routes: [
		{ 
			name: '/conceptualizacion-1', 
			templateUrl: 'con1', 
			controller: function(){},
			title: 'Vamos a repasar'
		},
		{ 
			name: '/actividad-1', 
			templateUrl: 'act1', 
			controller: 'Act1Ctrl',
			title: 'Actividad 1'
		},
		{ 
			name: '/actividad-2', 
			templateUrl: 'act2', 
			controller: 'Act2Ctrl',
			title: 'Actividad 2'
		},
		{ 
			name: '/actividad-3-1', 
			templateUrl: 'act3_1', 
			controller: 'Act3_1Ctrl',
			title: 'Actividad 3'
		},
		{ 
			name: '/actividad-3-2', 
			templateUrl: 'act3_2', 
			controller: 'Act3_2Ctrl',
			title: 'Actividad 3'
		},
		{ 
			name: '/actividad-4-1', 
			templateUrl: 'act4_1', 
			controller: 'Act4_1Ctrl',
			title: 'Actividad 4'
		},
		{ 
			name: '/actividad-4-2', 
			templateUrl: 'act4_2', 
			controller: 'Act4_2Ctrl',
			title: 'Actividad 4'
		}
	]
});

soc107.controller('Act1Ctrl', function ($scope) {
	$scope.options = {
		data: [
			{
				src1: "policia",
				alt1: "Policía ",
				src2: "ladron",
				alt2: "Ladrón con una bolsa en su mano donde lleva los objetos que se robó"
			},
			{
				src1: "hospital",
				alt1: "hospital",
				src2: "enfermo",
				alt2: "Niño enfermo recibiendo la fórmula médica de manos de su médico"
			},
			{
				src1: "bombero",
				alt1: "Bombero con extintor a un lado",
				src2: "incendio",
				alt2: "Casa incendiándose"
			},
			{
				src1: "colegio",
				alt1: "colegio",
				src2: "estudiar",
				alt2: "Niño con un libro en su mano, estudiando"
			}
		],
		minRightAnswers: 3,
		randomItems: true,
		randomTargets: true
	};
});

soc107.controller('Act2Ctrl', function ($scope) {
	$scope.options = {
		data: [
			{
				src1: "manos",
				alt1: "Manos",
				src2: "lavarse-las-manos",
				alt2: "Niño lavándose las manos en el lavamanos"
			},
			{
				src1: "dientes",
				alt1: "boca abierta donde se pueden ver los dientes y la lengua",
				src2: "lavar-dientes",
				alt2: "Niña lavándose los dientes"
			},
			{
				src1: "cabello",
				alt1: "Niña mostrando su cabello",
				src2: "peinarse",
				alt2: "Niña peinándose su cabello con una peinilla"
			},
			{
				src1: "pie",
				alt1: "pie",
				src2: "cortar-unas",
				alt2: "Mujer cortándose las uñas de los pies con el cortauñas"
			}
		],
		minRightAnswers: 3,
		randomItems: true,
		randomTargets: true,
		rightAnswerCallback: function (item) {
			// Buscamos el elemento de audio y lo reproducimos	
			$('#audio-' + item.src2)[0].play();
		}
	};
});

soc107.controller('Act3_1Ctrl', function ($scope) {
	// Obtenemos el audio deseado
	var source = '<audio id="audio-contaminacion" preload="auto">' +
					"<source src=\"" + $scope.resources + "/contaminacion.mp3\" type=\"audio/mpeg\">" +
				'</audio>';

	$('#main-container').append(source);

	$scope.data = {
		data: [
			{
				src: "humo.png",
				alt: "Industria arrojando humo al aire libre"
			},
			{
				src: "sembrar.png",
				alt: "Niña sembrando una planta",
				answer: false
			},
			{
				src: "basurera.png",
				alt: "Joven arrojando la basura dentro de una caneca",
				answer: false
			},
			{
				src: "reciclar.png",
				alt: "Tres canecas, una para depositar el vidrio y el cartón, otra para depositar los residuos ordinarios y la tercera para depositar el material plástico",
				answer: false
			},
			{
				src: "fumar.png",
				alt: "Cenicero con tres colillas de cigarrillo"
			},
			{
				src: "basura.png",
				alt: "Basura arrojada por fuera de la caneca"
			},
		],
		minRightAnswers: 2,
		chances: 3,
		rightAnswerCallback: function (item) {
			// Reproducimos el audio
			$('#audio-contaminacion')[0].play();	
		}
	};
});

soc107.controller('Act3_2Ctrl', function ($scope) {
	// Obtenemos el audio deseado
	var source = '<audio id="audio-proteccion" preload="auto">' +
					"<source src=\"" + $scope.resources + "/proteccion.mp3\" type=\"audio/mpeg\">" +
				'</audio>';

	$('#main-container').append(source);

	$scope.data = {
		data: [
			{
				src: "humo.png",
				alt: "Industria arrojando humo al aire libre",
				answer: false
			},
			{
				src: "sembrar.png",
				alt: "Niña sembrando una planta"
			},
			{
				src: "basurera.png",
				alt: "Joven arrojando la basura dentro de una caneca"
			},
			{
				src: "reciclar.png",
				alt: "Tres canecas, una para depositar el vidrio y el cartón, otra para depositar los residuos ordinarios y la tercera para depositar el material plástico"
			},
			{
				src: "fumar.png",
				alt: "Cenicero con tres colillas de cigarrillo",
				answer: false
			},
			{
				src: "basura.png",
				alt: "Basura arrojada por fuera de la caneca",
				answer: false
			},
		],
		minRightAnswers: 2,
		chances: 3,
		rightAnswerCallback: function (item) {
			// Reproducimos el audio
			$('#audio-proteccion')[0].play();	
		}
	};
});

soc107.controller('Act4_1Ctrl', function ($scope) {

	$scope.data = {
		data: [
			{
				src: "tractor.png",
				alt: "Tractor",
				answer: false
			},
			{
				src: "animales.png",
				alt: "Tres vacas caminando por el campo",
				answer: false
			},
			{
				src: "edificio.png",
				alt: "Edificio"
			},
			{
				src: "plantas-de-banano.png",
				alt: "Cultivo de banano",
				answer: false
			},
			{
				src: "semaforo.png",
				alt: "Semáforo"
			},
			{
				src: "metroplus.png",
				alt: "Bus de Metroplús"
			},
		],
		minRightAnswers: 2,
		chances: 3
	};
});

soc107.controller('Act4_2Ctrl', function ($scope) {

	$scope.data = {
		data: [
			{
				src: "tractor.png",
				alt: "Tractor"
			},
			{
				src: "animales.png",
				alt: "Tres vacas caminando por el campo"
			},
			{
				src: "edificio.png",
				alt: "Edificio",
				answer: false
			},
			{
				src: "plantas-de-banano.png",
				alt: "Cultivo de banano"
			},
			{
				src: "semaforo.png",
				alt: "Semáforo",
				answer: false
			},
			{
				src: "metroplus.png",
				alt: "Bus de Metroplús",
				answer: false
			},
		],
		minRightAnswers: 2,
		chances: 3
	};
});

// Binding for flash messages
ko.bindingHandlers.flash = {
    init: function(element) {
        $(element).hide();
    },
    update: function(element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (value) {
            $(element).stop().hide().text(value).fadeIn(function() {
                clearTimeout($(element).data("timeout"));
                $(element).data("timeout", setTimeout(function() {
                    $(element).fadeOut();
                    valueAccessor()(null);
                }, 1000));
            });
        }
    },
    timeout: null
};

//# sourceMappingURL=app.js.map