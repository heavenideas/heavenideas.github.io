class VisualizationEngine {
    constructor() {
        this.chartInstances = new Map();
    }

    renderInkCurveChart(deck, containerId) {
        const ctx = document.getElementById(containerId).getContext("2d");
        
        // Destroy existing chart if it exists
        this.destroyChart(containerId);

        const chart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"],
                datasets: [{
                    label: "Number of Cards",
                    data: deck.inkCurve,
                    backgroundColor: "rgba(54, 162, 235, 0.6)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: "Ink Curve Distribution"
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "Number of Cards"
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: "Ink Cost"
                        }
                    }
                }
            }
        });
        
        this.chartInstances.set(containerId, chart);
        return chart;
    }

    renderProbabilityChart(probabilities, containerId) {
        const ctx = document.getElementById(containerId).getContext("2d");
        
        // Destroy existing chart if it exists
        this.destroyChart(containerId);

        const labels = Object.keys(probabilities);
        const data = labels.map(label => probabilities[label].atLeast1 * 100);
        
        const chart = new Chart(ctx, {
            type: "bar", // Changed to bar for better display of individual card probabilities
            data: {
                labels: labels,
                datasets: [{
                    label: "Probability (%)",
                    data: data,
                    backgroundColor: data.map(value => 
                        value >= 80 ? "rgba(75, 192, 192, 0.6)" :
                        value >= 60 ? "rgba(255, 206, 86, 0.6)" :
                        "rgba(255, 99, 132, 0.6)"
                    )
                }]
            },
            options: {
                indexAxis: 'y', // This makes it a horizontal bar chart
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: "Opening Hand Probabilities (At Least 1 Copy)"
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: "Probability (%)"
                        }
                    }
                }
            }
        });
        
        this.chartInstances.set(containerId, chart);
        return chart;
    }

    renderMatchupMatrix(playerDeck, opponentDeck, interactions, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = "";
        
        const table = document.createElement("table");
        table.className = "matchup-matrix";
        
        // Create header row
        const headerRow = document.createElement("tr");
        headerRow.appendChild(document.createElement("th")); // Empty corner cell
        
        opponentDeck.cards.filter(card => card.type === "Character").forEach(card => {
            const th = document.createElement("th");
            th.textContent = card.name;
            th.className = "opponent-card";
            headerRow.appendChild(th);
        });
        
        table.appendChild(headerRow);
        
        // Create data rows
        playerDeck.cards.filter(card => card.type === "Character").forEach(playerCard => {
            const row = document.createElement("tr");
            
            const playerCardCell = document.createElement("th");
            playerCardCell.textContent = playerCard.name;
            playerCardCell.className = "player-card";
            row.appendChild(playerCardCell);
            
            opponentDeck.cards.filter(card => card.type === "Character").forEach(opponentCard => {
                const cell = document.createElement("td");
                const interaction = interactions[`${playerCard.name}_vs_${opponentCard.name}`];
                
                if (interaction) {
                    cell.className = `outcome-${interaction.outcome.toLowerCase()}`;
                    cell.textContent = this.getOutcomeSymbol(interaction.outcome);
                    cell.title = this.getOutcomeDescription(interaction);
                }
                
                row.appendChild(cell);
            });
            
            table.appendChild(row);
        });
        
        container.appendChild(table);
    }

    getOutcomeSymbol(outcome) {
        const symbols = {
            "FAVORABLE_TRADE": "✓",
            "UNFAVORABLE_TRADE": "✗",
            "MUTUAL_BANISH": "⚡",
            "STALEMATE": "=",
            "NO_INTERACTION": "—"
        };
        return symbols[outcome] || "?";
    }

    getOutcomeDescription(interaction) {
        const descriptions = {
            "FAVORABLE_TRADE": "Your character survives, opponent\"s is banished",
            "UNFAVORABLE_TRADE": "Your character is banished, opponent\"s survives",
            "MUTUAL_BANISH": "Both characters are banished",
            "STALEMATE": "Neither character can banish the other",
            "NO_INTERACTION": "No interaction possible"
        };
        return descriptions[interaction.outcome] || "Unknown outcome";
    }

    destroyChart(containerId) {
        const chart = this.chartInstances.get(containerId);
        if (chart) {
            chart.destroy();
            this.chartInstances.delete(containerId);
        }
    }

    destroyAllCharts() {
        this.chartInstances.forEach(chart => chart.destroy());
        this.chartInstances.clear();
    }
}

export default VisualizationEngine;


class VisualizationEngine {
    renderInkCurveChart(deck, elementId) {
        const ctx = document.getElementById(elementId).getContext("2d");
        new Chart(ctx, {
            type: "bar",
            data: {
                labels: Array.from({ length: 11 }, (_, i) => (i === 10 ? "10+" : i.toString())),
                datasets: [{
                    label: "Card Count",
                    data: deck.inkCurve,
                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "Number of Cards"
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: "Ink Cost"
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: `Ink Curve for ${deck.totalCards} cards`
                    }
                }
            }
        });
    }

    renderProbabilityChart(probabilities, elementId) {
        const ctx = document.getElementById(elementId).getContext("2d");
        new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["Characters", "Actions", "Items"],
                datasets: [{
                    label: "Probability of at least one in opening hand",
                    data: [probabilities.characters, probabilities.actions, probabilities.items],
                    backgroundColor: ["rgba(255, 99, 132, 0.6)", "rgba(54, 162, 235, 0.6)", "rgba(255, 206, 86, 0.6)"],
                    borderColor: ["rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)", "rgba(255, 206, 86, 1)"],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1,
                        title: {
                            display: true,
                            text: "Probability"
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: "Opening Hand Probabilities"
                    }
                }
            }
        });
    }

    renderMatchupMatrix(playerDeck, opponentDeck, interactions, elementId) {
        const container = document.getElementById(elementId);
        container.innerHTML = ""; // Clear previous content

        const table = document.createElement("table");
        const thead = document.createElement("thead");
        const tbody = document.createElement("tbody");

        // Header row
        const headerRow = document.createElement("tr");
        headerRow.innerHTML = `<th>Player Card \ Opponent Card</th>` + 
                              opponentDeck.cards.filter(c => c.type === "Character").map(c => `<th>${c.name}</th>`).join("");
        thead.appendChild(headerRow);

        // Body rows
        playerDeck.cards.filter(c => c.type === "Character").forEach(pChar => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${pChar.name}</td>` + 
                            opponentDeck.cards.filter(c => c.type === "Character").map(oChar => {
                                const interaction = interactions[`${pChar.name}_vs_${oChar.name}`];
                                let outcomeClass = "";
                                if (interaction) {
                                    if (interaction.outcome === "PLAYER_WINS") outcomeClass = "favorable";
                                    else if (interaction.outcome === "OPPONENT_WINS") outcomeClass = "unfavorable";
                                    else outcomeClass = "even";
                                }
                                return `<td class="${outcomeClass}">${interaction ? interaction.outcome.replace(/_/g, " ") : "N/A"}</td>`;
                            }).join("");
            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        container.appendChild(table);
    }
}

export default VisualizationEngine;


