/*jshint esversion: 6 */
/*jslint node: true */

'use strict';

const Alexa = require('ask-sdk-core');
var request = require('request');
var util = require('util');
var {
    db
} = require(__dirname + '/database.js');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome, you can say Hello or Help. Which would you like to try?';

        console.log('~~~~ LaunchRequest handled: ' + JSON.stringify(handlerInput, null, '    '));
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Hello World!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = 'You just triggered ' + intentName;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log('~~~~Error handled: ' + error.stack);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const ProactiveEventHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'AlexaSkillEvent.ProactiveSubscriptionChanged';
    },
    handle(handlerInput) {
        console.log('ALL AlexaSkillEvent.ProactiveSubscriptionChanged ' + JSON.stringify(handlerInput, null, 4));
        console.log('AWS User ' + handlerInput.requestEnvelope.context.System.user.userId);
        console.log('API Endpoint ' + handlerInput.requestEnvelope.context.System.apiEndpoint);
        console.log('Permissions' + (typeof handlerInput.requestEnvelope.request.body !== 'undefined') ? 'JA' : 'NEIN');

        var sql = `UPDATE wastecalendar.amz_user SET amz_permissions = ${(typeof handlerInput.requestEnvelope.request.body !== 'undefined') ? 1 : 0} WHERE amz_userid = ${db().escape(handlerInput.requestEnvelope.context.System.user.userId)}`;
        console.log('SQL: ' + sql);
        db().query(sql, function (err, result) {
            if (err) {
                console.error(err.stack);
            } else {
                console.log(result.affectedRows + ' record inserted ' + util.inspect(result));
            }
        });
    }
};

const AccountLinkedEventHandler = {
    canHandle(handlerInput) {
        //        console.log(handlerInput);
        return handlerInput.requestEnvelope.request.type === 'AlexaSkillEvent.SkillAccountLinked';
    },
    handle(handlerInput) {
        console.log('ALL AlexaSkillEvent.SkillAccountLinked ' + JSON.stringify(handlerInput, null, 4));
        console.log('AWS UserID ' + handlerInput.requestEnvelope.context.System.user.userId);
        console.log('OC AccessToken ' + handlerInput.requestEnvelope.context.System.user.accessToken);
        console.log('API Endpoint ' + handlerInput.requestEnvelope.context.System.apiEndpoint);
        console.log('API AccessToken ' + handlerInput.requestEnvelope.context.System.apiAccessToken);
        var options = {
            'method': 'GET',
            'url': 'https://cloud.vchrist.at/ocs/v2.php/cloud/user?format=json',
            'headers': {
                'Authorization': 'Bearer ' + handlerInput.requestEnvelope.context.System.user.accessToken
            }
        };
        request(options, function (error, response) {
            if (error) throw new Error(error);
            var oc_data = JSON.parse(response.body);
            console.log('OC Response: ' + JSON.stringify(oc_data, null, 4));

            var sql = `UPDATE wastecalendar.amz_user SET oc_userid = ${db().escape(oc_data.ocs.data.id)}, amz_accountlinked = 1 WHERE amz_userid = ${db().escape(handlerInput.requestEnvelope.context.System.user.userId)}`;
            console.log('SQL: ' + sql);
            db().query(sql, function (err, result) {
                if (err) {
                    console.error(err.stack);
                } else {
                    console.log(result.affectedRows + ' record inserted ' + util.inspect(result));
                }
            });
        });
    }
};

const SkillEnabledEventHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'AlexaSkillEvent.SkillEnabled';
    },
    handle(handlerInput) {
        console.log('ALL AlexaSkillEvent.SkillEnabled ' + JSON.stringify(handlerInput, null, 4));
        console.log('AWS UserID ' + handlerInput.requestEnvelope.context.System.user.userId);
        console.log('API Endpoint ' + handlerInput.requestEnvelope.context.System.apiEndpoint);

        var sql = `INSERT INTO wastecalendar.amz_user (amz_skillid, amz_userid, amz_apiendpoint, amz_apiaccesstoken) VALUES (
            ${db().escape(handlerInput.requestEnvelope.context.System.application.applicationId)},
            ${db().escape(handlerInput.requestEnvelope.context.System.user.userId)},
            ${db().escape(handlerInput.requestEnvelope.context.System.apiEndpoint)},
            ${db().escape(handlerInput.requestEnvelope.context.System.apiAccessToken)}
        )`;
        console.log('SQL: ' + sql);
        db().query(sql, function (err, result) {
            if (err) {
                console.error(err.stack);
            } else {
                console.log(result.affectedRows + ' record inserted ' + util.inspect(result));
            }
        });
    }
};

const SkillDisabledEventHandler = {
    canHandle(handlerInput) {
        //        console.log(handlerInput);
        return handlerInput.requestEnvelope.request.type === 'AlexaSkillEvent.SkillDisabled';
    },
    handle(handlerInput) {
        console.log('ALL AlexaSkillEvent.SkillDisabled ' + JSON.stringify(handlerInput, null, 4));
        console.log('AWS UserID ' + handlerInput.requestEnvelope.context.System.user.userId);
        console.log('API Endpoint ' + handlerInput.requestEnvelope.context.System.apiEndpoint);
        console.log('Persistence State ' + handlerInput.requestEnvelope.request.body.userInformationPersistenceStatus);

        var sql = `DELETE FROM wastecalendar.amz_user WHERE amz_userid = ${
                db().escape(handlerInput.requestEnvelope.context.System.user.userId)
            } AND amz_skillid = ${
                db().escape(handlerInput.requestEnvelope.context.System.application.applicationId)
            }`;
        console.log('SQL: ' + sql);
        db().query(sql, function (err, result) {
            if (err) {
                console.error(err.stack);
            } else {
                console.log(result.affectedRows + ' record inserted ' + util.inspect(result));
            }
        });
    }
};

//console.log('Test: ' + (typeof hallo == 'undefined') ? 'ja' : 'nein');
// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.skill = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HelloWorldIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        ProactiveEventHandler,
        AccountLinkedEventHandler,
        SessionEndedRequestHandler,
        SkillEnabledEventHandler,
        SkillDisabledEventHandler,
        IntentReflectorHandler // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(ErrorHandler)
    .withSkillId('amzn1.ask.skill.5119403b-f6c6-45f8-bd7e-87787e6f5da2')
    .create();
