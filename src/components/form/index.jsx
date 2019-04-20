import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'mobx-react';
import isEmpty from 'lodash/isEmpty';

import FormConsumer from './FormConsumer';
import ValidationAPIError from './validation/ValidationAPIError';
import ValidationGenericError from './validation/ValidationGenericError';

class Form extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false
        };
        this.onSubmit = this.onSubmit.bind(this);
        this.onUpdate = this.onUpdate.bind(this);
    }

    static getDerivedStateFromError(error) {
        console.log(error);
        return { hasError: true };
    }

    componentDidMount() {
        const { instance } = this.props;
        if (instance.isValidDefinition()) {
            instance.validate();
        }
    }

    componentDidCatch(error) {
        console.error(error);
    }

    onSubmit() {
        const { instance, onSubmit } = this.props;
        instance.validateOnSubmit();
        if (onSubmit) onSubmit();
    }

    onUpdate(event, id) {
        const { instance, onUpdate } = this.props;

        id = id || event.target.id;
        const field = instance.getField(id);

        const value = field.actions.onUpdate(event, field, instance.getModelValue(id));

        instance.setModelValue(id, value, field);
        instance.validate();

        if (onUpdate) {
            onUpdate({ id, value }); // Notify parent
        }
    }

    render() {
        const { instance } = this.props;

        if (this.state.hasError) {
            return <ValidationGenericError message="Error during rendering. Check console." />;
        }

        // No instance
        if (!instance || isEmpty(instance)) {
            return (
                <ValidationGenericError message="Missing required form instance. Did you create one with FormEngine?" />
            );
        }

        // Invalid definition
        if (!instance.isValidDefinition()) {
            return <ValidationAPIError error={instance.error} />;
        }

        if (isEmpty(instance.getSections())) {
            return <ValidationGenericError message="Form is missing required sections" />;
        }

        return (
            <Provider
                instance={instance}
                onSubmit={this.onSubmit}
                onUpdate={this.onUpdate}
                hideFormTitle={this.props.hideFormTitle}
                hideSubsectionTitles={this.props.hideSubsectionTitles}
                hideSubsectionSubtitles={this.props.hideSubsectionSubtitles}
                submitButtonLabel={this.props.submitButtonLabel}
            >
                <FormConsumer />
            </Provider>
        );
    }
}

Form.propTypes = {
    instance: PropTypes.object.isRequired,
    submitButtonLabel: PropTypes.string,
    hideFormTitle: PropTypes.bool,
    hideSubsectionTitles: PropTypes.bool,
    hideSubsectionSubtitles: PropTypes.bool,
    width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    onSubmit: PropTypes.func.isRequired,
    onUpdate: PropTypes.func
};

export default Form;
