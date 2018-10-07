/**
 * Generate gradient step colors.
 *
 * @param from Gradient start color (in hex format).
 * @param to Gradient end color (in hex format).
 * @param nbSteps Number of gradient steps to generate.
 */
export function generateColorGradient(from: string, to: string, nbSteps: number) {
    const parsedFrom = from.replace('#', '');
    const splitFrom = [
        parseInt(parsedFrom.substr(0, 2), 16),
        parseInt(parsedFrom.substr(2, 2), 16),
        parseInt(parsedFrom.substr(4, 2), 16)
    ];

    const parsedTo = to.replace('#', '');
    const splitTo = [
        parseInt(parsedTo.substr(0, 2), 16),
        parseInt(parsedTo.substr(2, 2), 16),
        parseInt(parsedTo.substr(4, 2), 16)
    ];

    const colorRanges = [
        splitTo[0] - splitFrom[0],
        splitTo[1] - splitFrom[1],
        splitTo[2] - splitFrom[2]
    ];

    const gradientColors: string[] = [];
    for (let i = 0; i <= nbSteps; ++i) {
        const colorStep = [
            Math.floor(splitFrom[0] + colorRanges[0] * i / nbSteps).toString(16),
            Math.floor(splitFrom[1] + colorRanges[1] * i / nbSteps).toString(16),
            Math.floor(splitFrom[2] + colorRanges[2] * i / nbSteps).toString(16)
        ];
        gradientColors.push(`#${ colorStep.join('') }`);
    }
    return gradientColors;
}
