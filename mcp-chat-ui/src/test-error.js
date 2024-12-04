const errorTracker = require('./utils/error-tracker');

// Test function with a common error
function testDivision(a, b) {
    try {
        // Deliberate error: division by zero
        if (b === 0) {
            throw new Error('Cannot divide by zero');
        }
        return a / b;
    } catch (error) {
        errorTracker.trackError(error, __filename, 6);
        throw error;
    }
}

// Test function with undefined variable
function testUndefined() {
    try {
        // Deliberate error: undefined variable
        console.log(undefinedVariable);
    } catch (error) {
        errorTracker.trackError(error, __filename, 17);
        throw error;
    }
}

// Test function with syntax error
function testSyntax() {
    try {
        // Deliberate syntax error
        eval('const x = {;}');
    } catch (error) {
        errorTracker.trackError(error, __filename, 28);
        throw error;
    }
}

// Export test functions
module.exports = {
    testDivision,
    testUndefined,
    testSyntax
};
