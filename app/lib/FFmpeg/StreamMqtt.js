export default class FFmpegStreamMqtt extends MODULECLASS {
    constructor(parent, options) {
        super(parent, options);
        this.label = 'FFMPEG STREAM MQTT';
        this.stream = parent;

        this.mqttEnable = this.stream.mqttEnable;
        this.mqttTopic = this.stream.mqttTopic;

        this.mqttTopicRecord = this.stream.mqttTopicRecord;
        this.mqttTopicAvailable = this.stream.mqttTopicAvailable;
        this.mqttTopicEnable = this.stream.mqttTopicEnable;

        this.mqttControlTopicEnable = this.stream.mqttControlTopicEnable;
        this.mqttControlTopicRecord = this.stream.mqttControlTopicRecord;
        this.mqttControlOptionsTopic = this.stream.mqttControlOptionsTopic;

        // convert true / false back to '1' and '0'
        [
            'mqttTopicValueOn',
            'mqttTopicValueOff',
            'mqttControlTopicValueOn',
            'mqttControlTopicValueOff'
        ].forEach(f => this.stream[f] === true ? this[f] = '1' : this[f] = '0');

        LOG(this.label, this.stream.name, 'INIT', this.stream.id);

        // subscribe for the control topic
        this.subscribeMqttControls();
        this.listenMqttControls();

    }

    publish(topic, value) {
        if (!this.mqttEnable)
            return;

        LOG(this.label, this.stream.name, 'PUBLISH', topic, value, {verbose: 2});
        APP.MQTT.publish(topic, `${value}`);
    }

    subscribeMqttControls() {
        if (!this.mqttEnable)
            return;

        this.mqttControlTopicEnable ? APP.MQTT.subscribe(this.mqttControlTopicEnable) : null;
        this.mqttControlTopicRecord ? APP.MQTT.subscribe(this.mqttControlTopicRecord) : null;
        this.mqttControlOptionsTopic ? APP.MQTT.subscribe(`${this.mqttControlOptionsTopic}/#`) : null;
    }

    listenMqttControls() {
        if (!this.mqttEnable)
            return;

        // when a control instruction comes
        if (this.mqttControlTopicEnable)
            APP.MQTT.on(this.mqttControlTopicEnable, data => {
                LOG(this.label, this.stream.name, 'GOT MESSAGE:', data, 'ON', this.mqttControlTopicEnable, {verbose: 2});
                data === this.mqttControlTopicValueOn ? this.stream.enable() : this.stream.disable();
            });

        // when a control instruction comes
        if (this.mqttControlTopicRecord)
            APP.MQTT.on(this.mqttControlTopicRecord, data => {
                LOG(this.label, this.stream.name, 'GOT MESSAGE:', data, 'ON', this.mqttControlTopicRecord, {verbose: 2});
                data === this.mqttControlTopicValueOn ? this.stream.record() : this.stream.stop();
            });

        // each available option property @TODO
        if (this.mqttControlOptionsTopic)
            ['property'].forEach(option => {
                APP.MQTT.on(`${this.mqttControlOptionsTopic}/${option}`, data => {
                    LOG(this.label, this.stream.name, 'GOT MESSAGE:', data, 'ON', `${this.mqttControlOptionsTopic}/${option}`, {verbose: 2});
                    this.stream[option] = option;

                    // ... or do something
                });
            });
    }

    enabled() {
        this.publish(this.mqttTopicEnable, `${this.mqttTopicValueOn}`);
    }

    disabled() {
        this.publish(this.mqttTopicEnable, `${this.mqttTopicValueOff}`);
    }

    available() {
        this.publish(this.mqttTopicAvailable, `${this.mqttTopicValueOn}`);
    }

    lost() {
        this.publish(this.mqttTopicAvailable, `${this.mqttTopicValueOff}`);
    }

    record() {
        this.publish(this.mqttTopicRecord, `${this.mqttTopicValueOn}`);
    }

    stop() {
        this.publish(this.mqttTopicRecord, `${this.mqttTopicValueOff}`);
    }


}