class ConfigService {
    constructor(rawConfig) {
        if (rawConfig === null || typeof rawConfig === 'undefined') {
            throw new Error(`invalid config: ${rawConfig}`);
        }

        const { apiToken } = rawConfig;

        if (typeof apiToken !== "string" || apiToken.length === 0) {
            throw new Error(`invalid config. expected apiToken to be a non-empty string`);
        }

        this.apiToken = apiToken;
    }

    get(propertyName) {
        if (!['apiToken', 'baseApiUrl'].includes(propertyName)) return null;

        return this[propertyName];
    }
}

class MarsWeatherDataService {
    #apiToken;

    constructor(configService) {
        this.#apiToken = configService.get('apiToken');
    }

    // https://api.nasa.gov/insight_weather/?api_key=DEMO_KEY&feedtype=json&ver=1.0
    async fetchWeatherReport() {
        // const endpoint = `https://api.nasa.gov/insight_weather/?api_key=${this.#apiToken}&feedtype=json&ver=1.0`;

        const endpoint = "https://mars.nasa.gov/rss/api/?feed=weather&category=insight_temperature&feedtype=json&ver=1.0";

        const result = await fetch(endpoint);

        // TODO Add error handling
        const json = result.json();

        return json;
    }
}

class WeatherReport {
    constructor({ AT }) {
        const { mn: minimumTemperature, mx: maximumTemperature, av: averageTemperature } = AT;

        this.minimumTemperature = minimumTemperature;

        this.maximumTemperature = maximumTemperature;

        this.averageTemperature = averageTemperature;
    }
}

const isWeatherReport = (input) => input !== null && typeof input !== 'undefined' && typeof input.AT === 'object'

// Inject dependencies
const configService = new ConfigService({
    apiToken: 'egwjutl6sb3kSqaIiNj7p0emR318VvZIpqhhIu5n'
});

const marsDataService = new MarsWeatherDataService(configService);

let state = {
    isLoading: false,
    // weatherMap
    // selectedDate
};

const syncDom = (state) =>{
    const {isLoading, weatherMap, selectedDate} = state;

    const rootElement = document.querySelector('#weather-summary')

    if(isLoading){
        rootElement.innerHTML = `<h2>Loading...</h2>`;

        return;
    }

    if(selectedDate !== null && typeof selectedDate !== 'undefined'){
        const weatherForLocation = weatherMap.get(selectedDate);

        const {maximumTemperature, minimumTemperature, averageTemperature} = weatherForLocation;

        rootElement.innerHTML = `<h2>Sol ${selectedDate}</h2><p>Max: ${maximumTemperature}, Min: ${minimumTemperature}, Temp: ${averageTemperature}</p>`;

        const resetButton = document.createElement('button');
        
        resetButton.appendChild(document.createTextNode('Menu'));

        resetButton.addEventListener('click',()=>{
            setState({
                selectedDate: undefined
            })
        });

        rootElement.appendChild(resetButton);

        return;
    }

    const dateSelection = document.createElement('select');

    dateSelection.name = "select-date";

    dateSelection.id = "date";

    dateSelection.addEventListener('change',(e) =>{
        setState({selectedDate: e.target.value})
    });

    [...weatherMap.keys()].forEach(
        (locationId) => {
            const option =  document.createElement('option');

            option.setAttribute('value',locationId);

            option.appendChild(document.createTextNode(locationId));

            console.log({
                locationId: option
            })

            dateSelection.append(
              option
            );
        }
    )

    const heading = document.createElement('h2');

    heading.textContent = `Choose a date:`;

    rootElement.innerHTML = '';

    rootElement.appendChild(heading);

    rootElement.appendChild(dateSelection);

}

const setState = (stateUpdates) =>{
    state = {
        ...state,
        ...stateUpdates
    };

    syncDom(state);
}

document.addEventListener('DOMContentLoaded', async () => {
    setState({ isLoading: true });

    console.log("fetching report");

    const marsWeather = await marsDataService.fetchWeatherReport();


    console.log({marsWeather})

    const weatherMap = Object.entries(marsWeather)
    .filter(([_key,value]) => isWeatherReport(value))
        .reduce(
            (weatherMap, [key, rawData]) => weatherMap.set(key, new WeatherReport(rawData))
            ,
            new Map()
        )

    console.log({ weatherMap })

    setState({ isLoading: false, weatherMap });



    // document.querySelector("#weather-summary").textContent = JSON.stringify(marsWeather);
})
