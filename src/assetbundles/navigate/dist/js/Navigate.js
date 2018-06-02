(function ($) {

    Craft.Navigate = Garnish.Base.extend(
        {
            id: null,
            entryModal: null,
            categoryModal: null,
            assetModal: null,
            currentElementType: null,
            structure: null,

            locale: null,
            siteHandle: null,
            siteUrl: 'craft3.local',
            savingNode: false,
            entrySources: '',

            $buildContainer: $('.navigate__builder'),
            $parentContainer: $('.node__parent'),
            $newWindowElement: $('.navigate .field input[name="blank"]'),
            $addElementButton: $('#navigate-nodeTypes').children(),

            $addElementLoader: $('.navigate .buttons .spinner'),

            init: function (id, entrySources) {
                this.id = id;
                this.entrySources = '*';
                this.siteHandle = 'default';
                this.structure = new Craft.NavigateStructure(this.id, '#navigate__nav', '.navigate__nav', settings);


                this.addListener(this.$addElementButton, 'activate', 'showModal');
                this.addListener(this.$manualForm, 'submit', 'onManualSubmit');
                this.addListener(this.$displayIdsButton, 'click', 'showNodeIds');
            },

            /**
             * Display ElementSelectorModal.
             */
            showModal: function (ev,) {
                this.currentElementType = $(ev.currentTarget).data('type');
                if (this.currentElementType == 'entry') {
                    if (!this.entryModal) {
                        this.entryModal = this.createModal("craft\\elements\\Entry", '*');
                    }
                    else {
                        this.entryModal.show();
                    }
                } else if (this.currentElementType == 'asset') {
                    if (!this.assetModal) {
                        this.assetModal = this.createModal('craft\\elements\\Asset', '*');
                    }
                    else {
                        this.assetModal.show();
                    }
                } else if (this.currentElementType == 'category') {
                    if (!this.categoryModal) {
                        this.categoryModal = this.createModal('craft\\elements\\Category', '*');
                    }
                    else {
                        this.categoryModal.show();
                    }
                } else if (this.currentElementType == 'url') {
                    this.urlModal = this.createModal('url');
                }
            },

            /**
             * Create ElementSelectorModal.
             */
            createModal: function (elementType, elementSources) {
                if (elementType === 'url') {
                    $modal = new Craft.NavigateUrlModal(this.structure);
                    return $modal;
                } else {
                    return Craft.createElementSelectorModal(elementType, {
                        criteria: {
                            site: this.siteHandle
                        },
                        sources: elementSources,
                        multiSelect: true,
                        onSelect: $.proxy(this, 'onModalSelect')
                    });
                }
            },

            /**
             * Handle selected elements from the ElementSelectorModal.
             */
            onModalSelect: function (elements) {
                var parentId = this.$parentContainer.find('#parent').val(),
                    elementType = this.currentElementType;

                for (var i = 0; i < elements.length; i++) {
                    var element = elements[i];

                    // Unselect element in modal
                    if (elementType == 'Entry') {
                        this.entryModal.$body.find('.element[data-id="' + element.id + '"]').closest('tr').removeClass('sel');
                    }
                    else if (elementType == 'Category') {
                        this.categoryModal.$body.find('.element[data-id="' + element.id + '"]').closest('tr').removeClass('sel');
                    }
                    else if (elementType == 'Asset') {
                        this.assetModal.$body.find('.element[data-id="' + element.id + '"]').closest('tr').removeClass('sel');
                    }

                    var data = {
                        navId: this.id,
                        name: element.label,
                        enabled: element.status == 'live',
                        url: element.url,
                        type: "element",
                        elementType: elementType,
                        blank: this.$newWindowElement.val() == '1',
                        elementId: element.id,
                        parentId: parentId === undefined ? 0 : parentId
                    };
                    this.structure.addNode(data, elementType);
                }
            },
            
        })

    Craft.NavigateUrlModal = Garnish.Modal.extend(
        {


            body: null,
            $subjectInput: null,
            $bodyInput: null,
            $spinner: null,

            init: function (structure) {


                this.structure = structure,
                    this.body = $('#node__url').html(),

                    this.base(null, {
                        resizable: false
                    });

                this.loadContainer(this.body);


            },

            loadContainer: function ($body) {
                var $container = $('<form class="modal fitted" accept-charset="UTF-8">' + $body + '</form>').appendTo(Garnish.$bod);
                this.setContainer($container);
                this.show();

                this.$nameInput = $container.find('.node-name:first');
                this.$urlInput = this.$container.find('.node-url:first');

                this.$cancelBtn = $container.find('.cancel:first');
                this.addListener(this.$cancelBtn, 'click', 'cancel');

                this.$submitBtn = $container.find('.submit:first');
                this.addListener(this.$container, 'submit', 'addNode');

                this.$spinner = this.$container.find('.spinner:first');


            },

            addNode: function (event) {
                event.preventDefault();

                if (this.loading) {
                    return;
                }

                var data = {
                    name: this.$nameInput.val(),
                    url: this.$urlInput.val()
                };


                this.$nameInput.removeClass('error');
                this.$urlInput.removeClass('error');


                if (!data.name || !data.url) {
                    if (!data.name) {
                        this.$nameInput.addClass('error');
                    }

                    if (!data.url) {
                        this.$urlInput.addClass('error');
                    }

                    Garnish.shake(this.$container);
                    return;
                }

                this.loading = true;
                this.$submitBtn.addClass('active');
                this.$spinner.show();
                this.structure.addNode(data, '0');
                this.$spinner.hide();
                this.hide();

            },


            cancel: function () {
                this.hide();

                if (this.message) {
                    this.message.modal = null;
                }
            }


        }
    )

    Craft.NavigateStructure = Craft.Structure.extend(
        {
            navId: null,

            $emptyContainer: $('.navigate__empty'),
            $template: $('#navigate__node').html(),

            /**
             *
             * @param int    navId
             * @param string id
             * @param string container
             * @param array  settings
             */
            init: function (navId, id, container, settings) {
                this.navId = navId;
                this.base(id, container, settings);

                this.$container.find('.delete').on('click', $.proxy(function (ev) {
                    this.removeElement($(ev.currentTarget));
                }, this));

            },


            /**
             * Save a new node to the database.
             *
             * @param array  data
             * @param string nodeType
             */
            addNode: function (data, nodeType) {
                var count = $('#navigate__nav').children().length;
                var nodeHtml = this.$template
                    .replace(/%%elementId%%/ig, data.elementId)
                    .replace(/%%count%%/ig, count + 1)
                    .replace(/%%status%%/ig, (data.enabled ? "live" : "expired"))
                    .replace(/%%label%%/ig, data.name)
                    .replace(/%%type%%/ig, data.type)
                    .replace(/%%elementType%%/ig, data.elementType)
                    .replace(/%%type%%/ig, data.elementType ? data.elementType.toLowerCase() : "manual")
                    .replace(/%%typeLabel%%/ig, data.elementType ? data.elementType : Craft.t("Manual"))
                    .replace(/%%url%%/ig, data.url.replace('{siteUrl}', this.siteUrl))
                    .replace(/%%urlless%%/ig, data.url.replace('{siteUrl}', ''))

                $node = $(nodeHtml);

                // Add it to the structure
                this.addElement($node, data.parentId);

            },

            /**
             * Add an element to the structure.
             *
             * @param object $element
             */
            /**
             * Add an element to the structure.
             *
             * @param object $element
             */
            addElement: function ($element, parentId) {
                var $appendTo = this.$container,
                    level = 1;

                // Add node to the structure
                var $li = $('<li data-level="' + level + '"/>').appendTo($appendTo),
                    indent = this.getIndent(level),
                    $row = $('<div class="node__node element" style="margin-' + Craft.left + ': -' + indent + 'px; padding-' + Craft.left + ': ' + indent + 'px;">').appendTo($li);
                $row.append($element);
                $row.append('<a class="delete" data-icon="remove" title="' + Craft.t('nagivate', 'Delete') + '"></a>');

                if (this.$container.length) {
                    this.$emptyContainer.addClass('hidden');
                }
            },

            /**
             * Remove an element from the structure.
             *
             * @param object $element
             */
            removeElement: function ($element) {
                var $li = $element.closest('li');
                confirmation = confirm(Craft.t('navigate', 'Are you sure you want to delete “{name}” and its descendants?', {name: $li.find('.node__node').data('label')}));
                if (confirmation) {
                    if (!$li.siblings().length) {
                        var $parentUl = $li.parent();
                    }

                    $li.css('visibility', 'hidden').velocity({marginBottom: -$li.height()}, 'fast', $.proxy(function () {
                        $li.remove();
                    }, this));
                }
            },
        });

})(jQuery);
