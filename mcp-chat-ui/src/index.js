#!/usr/bin/env node

const blessed = require('blessed');
const chalk = require('chalk');
const boxen = require('boxen');
const { program } = require('commander');

// Create a screen object
const screen = blessed.screen({
    smartCSR: true,
    title: 'MCP Bot Builder'
});

// Create layout boxes
const header = blessed.box({
    top: 0,
    left: 0,
    width: '75%',
    height: 3,
    content: chalk.bold(' 🤖 MCP Bot Builder'),
    tags: true,
    style: {
        fg: 'white',
        bg: 'blue'
    }
});

const chatBox = blessed.box({
    top: 3,
    left: 0,
    width: '75%',
    height: '90%-3',
    scrollable: true,
    alwaysScroll: true,
    tags: true,
    border: {
        type: 'line'
    },
    style: {
        fg: 'white',
        border: {
            fg: '#777777'
        }
    }
});

const inputBox = blessed.textbox({
    bottom: 0,
    left: 0,
    width: '75%',
    height: 3,
    inputOnFocus: true,
    padding: {
        left: 1,
        right: 1
    },
    style: {
        fg: 'white',
        bg: '#333333'
    }
});

const sidePanel = blessed.box({
    top: 0,
    right: 0,
    width: '25%',
    height: '100%',
    border: {
        type: 'line'
    },
    style: {
        border: {
            fg: '#777777'
        }
    }
});

const projectInfo = blessed.box({
    parent: sidePanel,
    top: 1,
    left: 1,
    right: 1,
    height: '30%',
    content: '📚 Project Knowledge\n\nNo knowledge added yet.',
    tags: true,
    style: {
        fg: 'white'
    }
});

// Add all elements to the screen
screen.append(header);
screen.append(chatBox);
screen.append(inputBox);
screen.append(sidePanel);

// Handle input
inputBox.on('submit', (text) => {
    if (text.trim() === 'exit') {
        process.exit(0);
    }
  
    // Add user message to chat
    chatBox.pushLine('{bold}You:{/bold} ' + text);
    chatBox.scrollTo(chatBox.getScrollHeight());
  
    // Clear input
    inputBox.clearValue();
    screen.render();
  
    // Simulate bot response (replace with actual bot logic)
    setTimeout(() => {
        chatBox.pushLine('{bold}🤖 MCP:{/bold} Processing your request...');
        chatBox.scrollTo(chatBox.getScrollHeight());
        screen.render();
    }, 500);
});

// Key bindings
screen.key(['escape', 'q', 'C-c'], () => {
    process.exit(0);
});

screen.key(['C-l'], () => {
    chatBox.setContent('');
    screen.render();
});

// Focus on input and render
inputBox.focus();
screen.render();
