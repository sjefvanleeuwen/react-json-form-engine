"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _mobx = require("mobx");

var _maybeBaby = _interopRequireDefault(require("maybe-baby"));

var _isString = _interopRequireDefault(require("lodash/isString"));

var _includes = _interopRequireDefault(require("lodash/includes"));

var _isEmpty = _interopRequireDefault(require("lodash/isEmpty"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _validationService = _interopRequireDefault(require("./service/validation-service"));

var _expressionService = _interopRequireDefault(require("./service/expression-service"));

var _formApiService = _interopRequireDefault(require("./service/form-api-service"));

var _formConfig = _interopRequireDefault(require("./config/form-config"));

var _formValidator = _interopRequireDefault(require("./validation/form-validator"));

var _validationResults = _interopRequireDefault(require("./validation/validation-results"));

var _common = require("../common");

var _formConst = require("./config/form-const");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var FIELD = _formConst.PROPERTY.FIELD,
    DEFINITION = _formConst.PROPERTY.DEFINITION;

var FormEngine =
/*#__PURE__*/
function () {
  function FormEngine(definition, model) {
    _classCallCheck(this, FormEngine);

    try {
      _formApiService.default.validateDefinitionShape(definition);

      this.__isDefinitionValid = true;
    } catch (error) {
      this.__isDefinitionValid = false;
      this.error = error;
      return;
    } // Form definition


    this.definition = definition; // UI decorators

    this.decorators = definition.decorators || {}; // Map of field ids keyed by trigger id

    this.showConditionTriggerMap = {}; // Stores validation results

    this.validationResults = new _validationResults.default(); // Observable built from validationResults

    this.validationMap = {
      form: false,
      sections: {},
      subsections: {},
      fields: {}
    };
    this.model = {}; // Map of form responses keyed by id

    this.sections = []; // Array of form sections

    this.fields = {}; // Map of form fields keyed by ids

    this.__initInstance(model);
  }
  /**
   * Initialize the form instance
   * @private
   */


  _createClass(FormEngine, [{
    key: "__initInstance",
    value: function __initInstance(model) {
      this.__cloneSections();

      this.__initFieldMetadata();

      this.__hydrateModel(model);
    }
    /**
     * Hydrate the instance mode with existing data
     * @param model
     * @private
     */

  }, {
    key: "__hydrateModel",
    value: function __hydrateModel(model) {
      var _this = this;

      if (!model || (0, _isEmpty.default)(model)) return;
      var parsed = model;

      if (typeof model === 'string') {
        try {
          parsed = JSON.parse(model);
        } catch (e) {
          console.error('** FormEngine.__hydrateModel: Unable to parse JSON model!');
          console.error("** You passed: ".concat(model));
          parsed = {};
        }
      }

      Object.keys(parsed).forEach(function (key) {
        _this.model[key] = parsed[key];
      });
    }
    /**
     * Don't modify the original definition. Instead, clone each section
     * into a map; all form instance data will then be
     * applied from these cloned sections, such as validation errors, etc.
     * @private
     */

  }, {
    key: "__cloneSections",
    value: function __cloneSections() {
      var _this2 = this;

      this.getDefinitionSections().forEach(function (section) {
        _this2.sections.push((0, _common.clone)(section));
      });
    }
    /**
     * Add each cloned subsection a map
     * @private
     */

  }, {
    key: "__initFieldMetadata",
    value: function __initFieldMetadata() {
      var _this3 = this;

      this.sections.forEach(function (section) {
        section.subsections.forEach(function (subsection) {
          subsection.section = section;

          _this3.__decorateFields(subsection.fields, subsection);
        });
      });
    }
    /**
     * Decorate an array of fields
     * @param fields
     * @private
     */

  }, {
    key: "__decorateFields",
    value: function __decorateFields(fields, parent) {
      var _this4 = this;

      if (Array.isArray(fields) && !(0, _isEmpty.default)(fields)) {
        fields.forEach(function (field) {
          _this4.__decorateField(field, parent);

          _this4.__decorateFields(field[FIELD.FIELDS], field);

          if (Array.isArray(field[FIELD.OPTIONS]) && !(0, _isEmpty.default)(field[FIELD.OPTIONS])) {
            field[FIELD.OPTIONS].forEach(function (option) {
              option[FIELD.PARENT] = field;

              _this4.__decorateFields(option[FIELD.FIELDS], option);
            });
          }
        });
      }
    }
    /**
     * Decorate a field with metadata such as the React component
     * to render in the UI, the onUpdate function, and any child
     * or option fields.
     * @param id
     * @param field
     * @private
     */

  }, {
    key: "__decorateField",
    value: function __decorateField(field, parent) {
      try {
        // Validate the basic shape of the object by ensuring there is
        // at least an "id", "type", and "title", as well as certain data
        // type checks (e.g min/max must be numbers, etc.)
        _formApiService.default.validateFieldShape(field);
      } catch (error) {
        this.__isDefinitionValid = false;
        this.error = error;
        return;
      }

      field[FIELD.PARENT] = parent;
      field[FIELD.UI_DECORATORS] = this.getCustomUIDecorators(field[FIELD.ID]);

      var _FormConfig$getCompon = _formConfig.default.getComponentConfig(field[FIELD.TYPE], _formConfig.default.getComponentTypeByField(field)),
          actions = _FormConfig$getCompon.actions,
          component = _FormConfig$getCompon.component,
          defaultDecorators = _FormConfig$getCompon.defaultDecorators;

      field[FIELD.ACTIONS] = actions;
      field[FIELD.COMPONENT] = component;

      try {
        // Validate data and component types shape. Ensure that
        // "array" type fields contain "option" array, "range"
        // type fields contain min/max, etc.
        _formApiService.default.validateFieldTypesShape(field);
      } catch (error) {
        this.__isDefinitionValid = false;
        this.error = error;
        return;
      } // Apply any default decorators


      if (defaultDecorators) {
        field[FIELD.UI_DECORATORS] = _objectSpread({}, field[FIELD.UI_DECORATORS], defaultDecorators);
      } // Convert string pattern to RegEx if specified


      if ((0, _isString.default)(field[FIELD.PATTERN])) {
        field[FIELD.PATTERN] = new RegExp(field[FIELD.PATTERN]);
      } // Register a show condition if specified


      if (field[FIELD.SHOW_CONDITION]) {
        this.__registerShowCondition(field);
      } // Add the field to fields


      this.fields[field[FIELD.ID]] = field;
    }
    /**
     * Register a field's showCondition with the instance. For any
     * form response expressions within the condition, add the form
     * response id (the trigger) to the map, along with the show
     * condition. When given model value is updated in setModelValue(),
     * we check the trigger map and evaluate any available show conditions.
     * If the condition evaluates to false, the field is cleared.
     * @param field
     */

  }, {
    key: "__registerShowCondition",
    value: function __registerShowCondition(field) {
      var _this5 = this;

      var _field$showCondition = field.showCondition,
          expression = _field$showCondition.expression,
          expression1 = _field$showCondition.expression1,
          expression2 = _field$showCondition.expression2;
      [expression, expression1, expression2].forEach(function (_expression) {
        if (_expressionService.default.isFormResponseExpression(_expression)) {
          var list = _this5.showConditionTriggerMap[_expression.id];

          if (!list) {
            list = [];
            _this5.showConditionTriggerMap[_expression.id] = list;
          }

          list.push(field[FIELD.ID]);
        }
      });
    }
    /**
     * Get form title
     * @returns {*}
     */

  }, {
    key: "getFormTitle",
    value: function getFormTitle() {
      return this.getDefinition().title;
    }
    /**
     * Get form icon
     * @returns {*}
     */

  }, {
    key: "getFormIcon",
    value: function getFormIcon() {
      var _this6 = this;

      return _maybeBaby.default.of(function () {
        return _this6.definition.faIcon.name;
      }).join();
    }
    /**
     * Get form icon prefix
     * @returns {*}
     */

  }, {
    key: "getFormIconPrefix",
    value: function getFormIconPrefix() {
      var _this7 = this;

      return _maybeBaby.default.of(function () {
        return _this7.definition.faIcon.prefix;
      }).join();
    }
    /**
     * Return whether the form is valid
     * @returns {boolean}
     */

  }, {
    key: "isValidDefinition",
    value: function isValidDefinition() {
      return this.__isDefinitionValid;
    }
    /**
     * Get form error
     * @returns {*}
     */

  }, {
    key: "getError",
    value: function getError() {
      return this.error;
    }
    /**
     * Get form definition
     * @returns {*}
     */

  }, {
    key: "getDefinition",
    value: function getDefinition() {
      return this.definition;
    }
    /**
     * Get the form definition id
     */

  }, {
    key: "getId",
    value: function getId() {
      return this.getDefinition()[DEFINITION.ID];
    }
    /**
     * Serialize the model to json
     * @returns {string}
     */

  }, {
    key: "serializeModel",
    value: function serializeModel() {
      return JSON.stringify(this.model);
    }
    /**
     * Determine if the model contains a key
     * @param id
     * @returns {LoDashExplicitWrapper<boolean>|boolean|Assertion}
     */

  }, {
    key: "hasModelValue",
    value: function hasModelValue(id) {
      return Boolean(this.getModelValue(id));
    }
    /**
     * Get form decorators
     * @returns {*|decorators|{str2, str3, str4}|{}}
     */

  }, {
    key: "getDecorators",
    value: function getDecorators() {
      return this.decorators;
    }
    /**
     * Get UI decorator by field id
     * @param id
     * @returns {*}
     */

  }, {
    key: "getCustomUIDecorators",
    value: function getCustomUIDecorators(id) {
      return this.getDecorators()[id];
    }
    /**
     * Get sections from the definition
     * @returns {*|Array|sections|{id, title, subtitle, sortOrder, subsections}}
     */

  }, {
    key: "getDefinitionSections",
    value: function getDefinitionSections() {
      return this.getDefinition().sections;
    }
    /**
     * Get form sections
     * @returns {{}|*}
     */

  }, {
    key: "getSections",
    value: function getSections() {
      return this.sections;
    }
    /**
     * Get form fields
     * @returns {{}|*}
     */

  }, {
    key: "getFields",
    value: function getFields() {
      return this.fields;
    }
    /**
     * Get single form field
     * @param id
     * @returns {*}
     */

  }, {
    key: "getField",
    value: function getField(id) {
      return this.fields[id];
    }
    /**
     * Determine if the field is a boolean data type
     * @param field
     * @returns {boolean}
     */

  }, {
    key: "isBooleanField",
    value: function isBooleanField(field) {
      return field[FIELD.TYPE] === _formConst.DATA_TYPE.BOOLEAN;
    }
    /**
     * Get a field's value
     * @param id
     * @returns {*}
     */

  }, {
    key: "getModelValue",
    value: function getModelValue(id) {
      return this.model[id];
    }
    /**
     * Set a model value
     * @param id
     * @param value
     * @param field
     */

  }, {
    key: "setModelValue",
    value: function setModelValue(id, value, field) {
      var _this8 = this;

      // Set or reset the model value
      if (value === this.getModelValue(id)) return;

      if (value === _formConst.NO_VALUE) {
        field.dirty = false;
        delete this.model[id];
      } else {
        field.dirty = true;
        this.model[id] = value;
      } // Reset children if necessary


      if (this.doResetChildren(field, value)) {
        this.resetFields(field[FIELD.FIELDS]);
      } // Reset the children of any option fields if the option is not selected


      if (field[FIELD.OPTIONS]) {
        field[FIELD.OPTIONS].forEach(function (option) {
          if (option[FIELD.FIELDS] && (_this8.isBooleanField(field) && !value || !(0, _includes.default)(value, option[FIELD.ID]))) {
            _this8.resetFields(option[FIELD.FIELDS]);
          }
        });
      } // Evaluate the show condition of dependent fields if this field is a trigger


      if (this.showConditionTriggerMap[id]) {
        this.showConditionTriggerMap[id].forEach(function (fieldId) {
          if (_this8.hasModelValue(fieldId) && !_this8.isVisible(_this8.getField(fieldId))) {
            _this8.setModelValue(fieldId, _formConst.NO_VALUE, _this8.getField(fieldId));
          }
        });
      }
    }
    /**
     * Reset a specific list of fields, if they contain a model value
     * @param fields
     */

  }, {
    key: "resetFields",
    value: function resetFields(fields) {
      var _this9 = this;

      if (fields) {
        fields.forEach(function (field) {
          if (_this9.hasModelValue(field[FIELD.ID]) && !_this9.isVisible(field)) {
            _this9.setModelValue(field[FIELD.ID], _formConst.NO_VALUE, field);
          }
        });
      }
    }
    /**
     * Determine whether to clear the children of a given field
     * based on its value
     * @param field
     * @param value
     * @returns {*}
     */

  }, {
    key: "doResetChildren",
    value: function doResetChildren(field, value) {
      if (!field[FIELD.FIELDS]) return false;

      switch (field[FIELD.TYPE]) {
        case _formConst.DATA_TYPE.DATE:
          return (0, _isNil.default)(value);

        case _formConst.DATA_TYPE.NUMBER:
          return Number.isNaN(value);

        case _formConst.DATA_TYPE.BOOLEAN:
          return value === false;

        case _formConst.DATA_TYPE.STRING:
          return (0, _common.isBlank)(value);

        case _formConst.DATA_TYPE.ARRAY:
          return (0, _isEmpty.default)(value);

        default:
          {
            console.warn("Unmapped field type: ".concat(field[FIELD.TYPE], " (id: ").concat(field[FIELD.ID], ")"));
            return false;
          }
      }
    }
    /**
     * Determine whether a field has a showCondition
     * @param field
     * @returns {boolean}
     */

  }, {
    key: "hasShowCondition",
    value: function hasShowCondition(field) {
      return Boolean(field[FIELD.SHOW_CONDITION]);
    }
    /**
     * Evaluate the show condition of the field
     * @param field
     * @param tag
     * @returns {*}
     */

  }, {
    key: "isVisible",
    value: function isVisible(field) {
      if (!this.hasShowCondition(field)) return true;
      return this.evaluateCondition(field[FIELD.SHOW_CONDITION]);
    }
    /**
     * Evaluate a condition
     * @param condition
     * @returns {*}
     */

  }, {
    key: "evaluateCondition",
    value: function evaluateCondition(condition) {
      if (!condition) return false;
      return _expressionService.default.evalCondition(condition, this);
    }
    /**
     * Validate the form instance
     * @param comprehensive
     */

  }, {
    key: "validate",
    value: function validate() {
      var comprehensive = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      this.validationResults = _formValidator.default.validate(this, this.validationResults, comprehensive);
      this.buildObservableValidationMap();
    }
    /**
     * Validate the form instance during form submission
     */

  }, {
    key: "validateOnSubmit",
    value: function validateOnSubmit() {
      this.validate(true);
    }
    /**
     * Build an observable map based on validationResults.
     * This map holds all sections, subsections and fields.
     */

  }, {
    key: "buildObservableValidationMap",
    value: function buildObservableValidationMap() {
      var _this10 = this;

      this.validationMap.form = this.hasError();
      this.sections.forEach(function (section) {
        _this10.validationMap.sections[section[FIELD.ID]] = _this10.sectionHasError(section);
        section.subsections.forEach(function (subsection) {
          _this10.validationMap.subsections[subsection[FIELD.ID]] = _this10.subsectionHasError(subsection);
        });
      });
      Object.keys(this.fields).forEach(function (id) {
        _this10.validationMap.fields[id] = _this10.fieldHasError(id);
      });
    }
    /**
     * Get validation results by field id
     * @param id
     * @returns {{status: (*|string), messages: (*|Array)}}
     */

  }, {
    key: "getValidationResultByTag",
    value: function getValidationResultByTag(id) {
      return this.validationResults.getResults(id);
    }
    /**
     * Get validation results status (e.g. ERROR, OK) by field id
     * @param id
     * @returns {*|string}
     */

  }, {
    key: "getValidationStatusByTag",
    value: function getValidationStatusByTag(id) {
      return this.getValidationResultByTag(id).status;
    }
    /**
     * Recursively check for validation statuses, and return
     * the most severe status
     * @param id
     * @returns {*|string}
     */

  }, {
    key: "getDeepValidationStatusByTag",
    value: function getDeepValidationStatusByTag(id) {
      var status = this.getValidationResultByTag(id).status;
      var newStatus = this.findValidationStatus(this.getField(id)[FIELD.FIELDS], this.getDeepValidationStatusByTag.bind(this), true);

      if (_validationService.default.isMoreSevereStatus(newStatus, status)) {
        status = newStatus;
      }

      return status;
    }
    /**
     * Generically find the validation status of sections, subsections, or fields.
     * Return the most severe status.
     * @param list
     * @param getStatus
     * @param useId
     * @returns {string}
     */

  }, {
    key: "findValidationStatus",
    value: function findValidationStatus() {
      var list = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var getStatus = arguments.length > 1 ? arguments[1] : undefined;
      var useId = arguments.length > 2 ? arguments[2] : undefined;
      var status = _formConst.VALIDATION_CONST.STATUS.OK;
      list.forEach(function (entry) {
        var newStatus = getStatus(useId ? entry[FIELD.ID] : entry);

        if (_validationService.default.isMoreSevereStatus(newStatus, status)) {
          status = newStatus;
        }
      });
      return status;
    }
    /**
     * Return the validation status of a subsection
     * @param subsection
     * @returns {string}
     */

  }, {
    key: "getSubsectionStatus",
    value: function getSubsectionStatus(subsection) {
      return this.findValidationStatus(subsection.fields, this.getDeepValidationStatusByTag.bind(this), true);
    }
    /**
     * Return the validation status of a section
     * @param section
     * @returns {string}
     */

  }, {
    key: "getSectionStatus",
    value: function getSectionStatus(section) {
      return this.findValidationStatus(section.subsections, this.getSubsectionStatus.bind(this));
    }
    /**
     * Determine if a field has a validation error
     * @param id
     * @returns {*}
     */

  }, {
    key: "fieldHasError",
    value: function fieldHasError(id) {
      return _validationService.default.isError(this.getValidationStatusByTag(id));
    }
    /**
     * Determine if a subsection has a validation error
     * @param subsection
     * @returns {*}
     */

  }, {
    key: "subsectionHasError",
    value: function subsectionHasError(subsection) {
      return _validationService.default.isError(this.getSubsectionStatus(subsection));
    }
    /**
     * Determine if a section has a validation error
     * @param section
     * @returns {*}
     */

  }, {
    key: "sectionHasError",
    value: function sectionHasError(section) {
      return _validationService.default.isError(this.getSectionStatus(section));
    }
    /**
     * Determine if the form instance has a validation error
     * @returns {boolean}
     */

  }, {
    key: "hasError",
    value: function hasError() {
      return this.validationResults.hasError();
    }
  }]);

  return FormEngine;
}();

(0, _mobx.decorate)(FormEngine, {
  model: _mobx.observable,
  validationMap: _mobx.observable
});
var _default = FormEngine;
exports.default = _default;