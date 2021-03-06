import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const regex = /^Error: (.+)$/m;

function parseAPICheckErrorMessage(error) {
    if (!error) return null;
    if (regex.test(error)) {
        const matches = regex.exec(error);
        if (matches) {
            return matches[1];
        }
    }
    return null;
}

const ValidationAPIError = ({ error }) => {
    let message = parseAPICheckErrorMessage(error);
    return (
        <div className="__rjfe__ panel">
            <div className="panel-heading">
                <div className="validation-api-error">
                    <FontAwesomeIcon icon="exclamation-triangle" className="has-text-danger" />
                    &nbsp;
                    <h3>{message || 'Error initializing FormEngine'}</h3>
                </div>
            </div>
        </div>
    );
};

ValidationAPIError.propTypes = {
    error: PropTypes.object.isRequired
};

export default ValidationAPIError;
