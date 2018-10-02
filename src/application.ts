import { POLL_CLOSE_TIME, REFRESH_INTERVAL } from './settings';


/**
 * Application.
 */
export default class Application {
    /**
     * Chart for the number of Votes per Party.
     */
    protected VotesChart: Chart = null;
    /**
     * Chart for the number of Seats per Party.
     */
    protected SeatsChart: Chart = null;
    /**
     * ID of the Riding currently being displayed.
     */
    protected SelectedRidingID: number = -1;
    /**
     * List of Riding data.
     */
    protected Ridings: Circonscription[] = [];


    /**
     * Constructor.
     */
    constructor() {
        this.onResultsLoaded = this.onResultsLoaded.bind(this);

        this.installListeners();
        this.setupCharts();
        this.installJONPCallback();
        this.fetchData();
    }

    /**
     * Create Charts for number of Votes and Seats per Party.
     */
    protected setupCharts() {
        const initialData: number[] = [];

        const createChartConfig = (colors: string[]) => {
            return {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: initialData,
                        borderWidth: [0, 0, 0, 0, 0, 0],
                        backgroundColor: colors,
                        hoverBackgroundColor: colors
                    }]
                },
                options: {
                    cutoutPercentage: 90,
                    legend: {
                        position: 'left'
                    },
                    animation: {
                        animateRotate: true
                    }
                }
            };
        };

        // Create "Seats" Chart:
        const seatsCanvas = document.getElementById('seats') as HTMLCanvasElement;
        if (seatsCanvas !== null) {
            this.SeatsChart = new Chart(
                seatsCanvas,
                createChartConfig(['#da4d60', '#e96577', '#f28695', '#ffb6c1', '#e5e5e5'])
            );
        }

        // Create "Votes" Chart:
        const votesCanvas = document.getElementById('votes') as HTMLCanvasElement;
        if (votesCanvas !== null) {
            this.VotesChart = new Chart(
                votesCanvas,
                createChartConfig(['#6933b9', '#8553d1', '#a372ec', '#be9df1', '#e5e5e5'])
            );
        }
    }

    /**
     * Install the JSONP callback used to load remote data.
     */
    protected installJONPCallback() {
        window.callback = this.onResultsLoaded;
    }

    /**
     * Install DOM Listeners.
     */
    protected installListeners() {
        const ridingsDropDownElement = document.getElementById('ridings-list') as HTMLSelectElement;
        if (ridingsDropDownElement !== null) {
            ridingsDropDownElement.addEventListener('change', e => {
                this.SelectedRidingID = parseInt(ridingsDropDownElement.options[ridingsDropDownElement.selectedIndex].value, 10);
                const selectedRiding = this.Ridings.filter(riding => riding.numeroCirconscription === this.SelectedRidingID);
                this.updateRiding(selectedRiding[0]);
            });
        }
    }

    /**
     * Fetch results from the remote web service.
     */
    protected async fetchData() {
        const refresh = () => {
            setTimeout(() => {
                this.fetchData();
            }, REFRESH_INTERVAL);
        };

        const JSONP_ELEMENT_ID = 'jsonp-data';
        const NOW = Date.now();
        const url = NOW > POLL_CLOSE_TIME
            ? `https://dgeq.org/resultats.js?_=${NOW}`
            : `https://dgeq.org/doc/gen7-4-2014/resultats.js?_=${NOW}`;

        return new Promise((resolve, reject) => {
            let scriptElement = document.getElementById(JSONP_ELEMENT_ID) as HTMLScriptElement;
            if (scriptElement !== null) {
                document.body.removeChild(scriptElement);
            }

            scriptElement = document.createElement('script');
            scriptElement.id = JSONP_ELEMENT_ID;
            scriptElement.charset = 'utf-8';
            scriptElement.async = true;
            scriptElement.defer = true;
            scriptElement.addEventListener('load', e => {
                refresh();
                resolve();
            });
            scriptElement.addEventListener('error', e => {
                refresh();
                reject();
            });
            scriptElement.src = url;
            document.body.appendChild(scriptElement);
        });
    }

    /**
     * Callback executed upon loading results from the remote web service.
     *
     * @param results Results loaded from the remote web service.
     */
    protected onResultsLoaded(results: Results) {
        const parties = [...results.statistiques.partisPolitiques];
        const sortedParties = parties.sort((a, b) => {
            return (a.nbCirconscriptionsEnAvance > b.nbCirconscriptionsEnAvance)
                ? -1
                : (a.nbCirconscriptionsEnAvance < b.nbCirconscriptionsEnAvance)
                    ? 1 : 0;
        });

        const partiesList = document.getElementById('parties-list');
        if (partiesList !== null) {
            partiesList.innerHTML = sortedParties
                .map((party, i) => {
                    return `
                        <tr>
                            <th scope="row" class="text-right">${i + 1}</th>
                            <td>${party.nomPartiPolitique}</td>
                            <td>${this.sanitizePartyAbbreviation(party.abreviationPartiPolitique)}</td>
                            <td class="text-right">${party.tauxVoteTotal.toFixed(4)}%</td>
                            <td class="text-right">${party.nbCirconscriptionsEnAvance}</td>
                        </tr>`;
                })
                .join('');
        }

        // Store data about the Ridings:
        this.Ridings = results.circonscriptions;

        // Update dashboard data:
        this.updateOverviewStats(results);
        this.updateStationsRidingsResults(results);
        this.updateRidings(results);
        this.drawVotesChart(results);
        this.drawSeatsChart(results);
    }

    /**
     * Update results for the top 4 political parties.
     *
     * @param results Results loaded from the remote web service.
     */
    protected updateOverviewStats(results: Results) {
        const resultCards = document.querySelectorAll('.result-card');
        const nbResults = Math.min(
            resultCards.length,
            results.statistiques.partisPolitiques.length
        );

        for (let i = 0; i < nbResults; ++i) {
            const party = results.statistiques.partisPolitiques[i];
            if (party.tauxCirconscriptionsEnAvance > 0) {
                const resultCard = resultCards[i];

                const partyName: HTMLDivElement = resultCard.querySelector('.party-name');
                if (partyName !== null) {
                    partyName.innerText = this.sanitizePartyAbbreviation(party.abreviationPartiPolitique);
                }

                const seatCounter: HTMLDivElement = resultCard.querySelector('.count');
                if (seatCounter !== null) {
                    seatCounter.innerText = party.nbCirconscriptionsEnAvance.toString();
                }

                const voteProgressBar: HTMLDivElement = resultCard.querySelector(`.dashbg-${i + 1}`);
                if (voteProgressBar !== null) {
                    voteProgressBar.style.width = `${party.tauxVoteTotal}%`;
                }
            }
        }
    }

    /**
     * Update polling station results.
     *
     * @param results Results loaded from the remote web service.
     */
    protected updateStationsRidingsResults(results: Results) {
        const { statistiques } = results;

        const stationsResults = document.querySelector('.stations-results');
        if (stationsResults !== null) {
            const count: HTMLElement = stationsResults.querySelector('.count');
            if (count !== null) {
                count.innerText = statistiques.nbBureauVoteRempli.toLocaleString();
            }

            const progressBar: HTMLDivElement = stationsResults.querySelector('div[role="progressbar"]');
            if (progressBar !== null) {
                progressBar.style.width = `${statistiques.tauxBureauVoteRempli}%`;
            }
        }

        const ridingsResults = document.querySelector('.ridings-results');
        if (ridingsResults !== null) {
            const count: HTMLElement = ridingsResults.querySelector('.count');
            if (count !== null) {
                count.innerText = statistiques.nbCirconscriptionAvecResultat.toLocaleString();
            }

            const progressBar: HTMLDivElement = ridingsResults.querySelector('div[role="progressbar"]');
            if (progressBar !== null) {
                progressBar.style.width = `${100.0 - statistiques.tauxCirconscriptionSansResultat}%`
            }
        }

        const votesCast = document.getElementById('votes-cast');
        if (votesCast !== null) {
            votesCast.innerText = statistiques.nbVoteExerce.toLocaleString();
        }
        const partPercent = document.getElementById('part-rate');
        if (partPercent !== null) {
            partPercent.style.width = `${statistiques.tauxParticipationTotal}%`;
        }

        const validVotes = document.getElementById('valid-votes');
        if (validVotes !== null) {
            validVotes.innerText = statistiques.nbVoteValide.toLocaleString();
        }
        const validVotesRate = document.getElementById('valid-votes-rate');
        if (validVotesRate !== null) {
            validVotesRate.style.width = `${statistiques.nbVoteValide * 100 / statistiques.nbVoteExerce}%`;
        }

        const rejectedVotes = document.getElementById('rejected-votes');
        if (rejectedVotes !== null) {
            rejectedVotes.innerText = statistiques.nbVoteRejete.toLocaleString();
        }
        const rejectedVoteRate = document.getElementById('rejected-vote-rate');
        if (rejectedVoteRate !== null) {
            rejectedVoteRate.style.width = `${statistiques.nbVoteRejete * 100 / statistiques.nbVoteExerce}%`;
        }

        const participationRate = document.getElementById('participation-rate');
        if (participationRate !== null) {
            const participationRateLabel = typeof statistiques.tauxParticipationTotal === 'number'
                ? `${statistiques.tauxParticipationTotal.toString()}%`
                : '&mdash;';
            participationRate.innerHTML = participationRateLabel;
        }


        // Update the timestamp of the last refresh time:
        const lastUpdatedDate = document.getElementById('last-update-date');
        const lastUpdateTime = document.getElementById('last-update-time');
        if (lastUpdatedDate !== null && lastUpdateTime !== null) {
            const lastUpdateDate = new Date(
                Date.parse(statistiques.iso8601DateMAJ.replace(',', '.'))
            );
            lastUpdatedDate.innerText = lastUpdateDate.toLocaleDateString();
            lastUpdateTime.innerText = lastUpdateDate.toLocaleTimeString();
        }
    }

    /**
     * Update the Chart for the number of Seats per Party.
     *
     * @param results Results loaded from the remote web service.
     */
    protected drawSeatsChart(results: Results) {
        const { statistiques } = results;

        const TOTAL_NB_SEATS = 125;
        const currentNBSeats = statistiques.partisPolitiques
            .reduce((accumulator, currentParty) => {
                return accumulator + currentParty.nbCirconscriptionsEnAvance;
            }, 0);
        const seats = [
            ...statistiques.partisPolitiques
                .filter(party => party.nbCirconscriptionsEnAvance > 0)
                .map(party => party.nbCirconscriptionsEnAvance),
            TOTAL_NB_SEATS - currentNBSeats
        ];
        const potentialLabels = [
            ...statistiques.partisPolitiques
                .filter(party => party.nbCirconscriptionsEnAvance > 0)
                .map(party => this.sanitizePartyAbbreviation(party.abreviationPartiPolitique)),
            'Others'
        ];
        const labels = potentialLabels.length > 1 ? potentialLabels : ['N./A.'];

        if (this.SeatsChart !== null) {
            this.SeatsChart.data.labels = labels;
            this.SeatsChart.data.datasets[0].data = seats;
            this.SeatsChart.update();
        }

        const leadingPartyLabel = document.getElementById('leading-party-by-seats');
        if (leadingPartyLabel !== null && labels.length > 0) {
            leadingPartyLabel.innerText = labels[0];
        }
    }

    /**
     * Update the Chart for the number of Votes per Party.
     *
     * @param results Results loaded from the remote web service.
     */
    protected drawVotesChart(results: Results) {
        const { statistiques } = results;

        const filteredParties = statistiques.partisPolitiques
            .filter(party => party.nbCirconscriptionsEnAvance > 0);

        const NB_CURRENT_PERCENT = filteredParties
            .reduce((accumulator, current) => accumulator + current.tauxVoteTotal, 0);
        const votes = [
            ...filteredParties.map(party => party.tauxVoteTotal),
            100.0 - NB_CURRENT_PERCENT
        ];

        const potentialLabels = [
            ...filteredParties.map(party => this.sanitizePartyAbbreviation(party.abreviationPartiPolitique)),
            'Others'
        ];
        const labels = potentialLabels.length > 1 ? potentialLabels : ['N./A.'];

        if (this.VotesChart !== null) {
            this.VotesChart.data.labels = labels;
            this.VotesChart.data.datasets[0].data = votes;
            this.VotesChart.update();
        }

        const leadingPartyLabel = document.getElementById('leading-party-by-votes');
        if (leadingPartyLabel !== null && labels.length > 0) {
            leadingPartyLabel.innerText = labels[0];
        }
    }

    /**
     * Update the data about the Riding currently displayed.
     *
     * @param results Results loaded from the remote web service.
     */
    protected updateRidings(results: Results) {
        // Update the list of available ridings:
        const ridingsDropDownElement = document.getElementById('ridings-list');
        if (ridingsDropDownElement !== null) {
            ridingsDropDownElement.innerHTML = results.circonscriptions
                .map(riding => {
                    const isSelected = this.SelectedRidingID === riding.numeroCirconscription
                        ? 'selected="selected"'
                        : '';
                    return `
                        <option ${isSelected} value="${riding.numeroCirconscription}">
                            ${riding.nomCirconscription}
                        </option>
                    `;
                })
                .join('');
        }

        // Update the riding currently displayed:
        if (this.SelectedRidingID !== -1) {
            const selectedRiding = results.circonscriptions
                .filter(riding => riding.numeroCirconscription === this.SelectedRidingID);
            this.updateRiding(selectedRiding[0]);
        } else if (results.circonscriptions.length > 0) {
            this.updateRiding(results.circonscriptions[0]);
        }
    }

    /**
     * Update the Riding currently displayed.
     *
     * @param riding Data about the Riding currently displayed.
     */
    protected updateRiding(riding: Circonscription) {
        const ridingCandidatesList = document.getElementById('riding-candidates-list');
        if (ridingCandidatesList !== null) {
            ridingCandidatesList.innerHTML = riding.candidats
                .map((candidate, i) => {
                    const advanceVotes = candidate.nbVoteAvance > 0
                        ? `<span class="text-success">
                                <i class="fa fa-caret-up"></i> ${candidate.nbVoteAvance.toLocaleString()}
                            </span>`
                        : '';
                    return `
                        <tr>
                            <th scope="row" class="text-right">${i + 1}</th>
                            <td>${this.sanitizePartyAbbreviation(candidate.abreviationPartiPolitique)}</td>
                            <td>${candidate.prenom} ${candidate.nom}</td>
                            <td class="text-right">${candidate.nbVoteTotal.toLocaleString()}</td>
                            <td class="text-left">${advanceVotes}</td>
                            <td class="text-right">${candidate.tauxVote.toFixed(2)}%</td>
                        </tr>
                    `;
                })
                .join('');
        }

        const ridingStationsComplete = document.getElementById('riding-stations-complete');
        if (ridingStationsComplete !== null) {
            ridingStationsComplete.innerText = riding.nbBureauComplete.toLocaleString();
        }

        const ridingStationsTotal = document.getElementById('riding-stations-total');
        if (ridingStationsTotal !== null) {
            ridingStationsTotal.innerText = riding.nbBureauTotal.toLocaleString();
        }

        const ridingRegisteredVoters = document.getElementById('riding-registered-voters');
        if (ridingRegisteredVoters !== null) {
            ridingRegisteredVoters.innerText = riding.nbElecteurInscrit.toLocaleString();
        }

        const ridingParticipationRate = document.getElementById('riding-participation-rate');
        if (ridingParticipationRate !== null) {
            const participationRate = typeof riding.tauxParticipation === 'number'
                ? `${riding.tauxParticipation.toFixed(2)}%`
                : '&mdash;';
            ridingParticipationRate.innerHTML = participationRate;
        }
    }

    /**
     * Shorten the given Political Party name.
     *
     * @param abbreviation Abbreviation for the Political Party to sanitize.
     * @return The shortened version of the abbreviated Political Party name.
     */
    protected sanitizePartyAbbreviation(abbreviation: string) {
        switch (abbreviation.toUpperCase()) {
            case 'P.L.Q./Q.L.P.':
                return 'P.L.Q.';
            case 'C.A.Q.-É.F.L.':
                return 'C.A.Q.';
            case 'P.C.Q./C.P.Q.':
            case 'É.A.P. - P.C.Q.':
                return 'P.C.Q.';
            case 'P.V.Q./G.P.Q.':
                return 'P.V.Q.';
            case 'U.C.Q./Q.C.U.':
                return 'U.C.Q.';
            case 'O.N. - P.I.Q.':
                return 'O.N.';
            default:
                return abbreviation.toUpperCase();
        }
    }
}
