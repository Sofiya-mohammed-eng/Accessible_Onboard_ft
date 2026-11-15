import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  acceptHeldConfirmation,
  accountChoice,
  applyAccountFields,
  emptyHeldAccount,
  firstHeldField,
  interpretAccount,
  retainAccountFields,
} from './accountIntent';
import { emailLooksValid, normalizeSpokenEmail } from './spokenEmail';

const phrases = {
  yes: ['yes', 'yeah', 'yep', 'ok', 'okay', 'አዎ', 'አዎን', 'እሺ'],
  signIn: ['sign in', 'login', 'log in', 'ግባ', 'መግቢያ'],
  register: ['register', 'sign up', 'create account', 'ተመዝገብ', 'ምዝገባ'],
};

test('keeps a name that ends with a period', () => {
  const uttered = 'My name is Alex.';
  const intent = interpretAccount(uttered, phrases);
  assert.equal(intent.original, uttered);
  assert.equal(intent.name, 'Alex');
  assert.equal(intent.email, '');
});

test('keeps the name when an email cue follows it', () => {
  const uttered = 'Hello, my name is Alex. My email is alex@example.com.';
  const intent = interpretAccount(uttered, phrases);
  assert.equal(intent.original, uttered);
  assert.equal(intent.name, 'Alex');
  assert.equal(intent.email, 'alex@example.com');
});

test('keeps both words of a full name', () => {
  const uttered = 'My full name is Alex Smith and my email is alex@example.com.';
  const intent = interpretAccount(uttered, phrases);
  assert.equal(intent.original, uttered);
  assert.equal(intent.name, 'Alex Smith');
  assert.equal(intent.email, 'alex@example.com');
});

test('extracts a name introduced by I am', () => {
  const uttered = 'I am Alex.';
  const intent = interpretAccount(uttered, phrases);
  assert.equal(intent.original, uttered);
  assert.equal(intent.name, 'Alex');
  assert.equal(intent.email, '');
});

test('preserves the name and email from one sentence', () => {
  const uttered = 'Hello, my name is Alex. My email address is alex@example.com.';
  const intent = interpretAccount(uttered, phrases);
  assert.equal(intent.original, uttered);
  assert.equal(intent.name, 'Alex');
  assert.equal(intent.email, 'alex@example.com');
  assert.equal(intent.emailUnclear, false);
  assert.notEqual(intent.original, intent.email);
  assert.notEqual(intent.original, intent.name);
});

test('reads a spoken email that uses at and dot', () => {
  const uttered = 'alex at example dot com';
  const intent = interpretAccount(uttered, phrases);
  assert.equal(intent.original, uttered);
  assert.equal(normalizeSpokenEmail(uttered), 'alex@example.com');
  assert.equal(intent.email, 'alex@example.com');
  assert.equal(intent.emailUnclear, false);
});

test('reads an email that includes normal punctuation', () => {
  const uttered = 'My email address is alex@example.com.';
  const intent = interpretAccount(uttered, phrases);
  assert.equal(intent.original, uttered);
  assert.equal(intent.email, 'alex@example.com');
  assert.equal(emailLooksValid(intent.email), true);
});

test('does not turn gmail.commy into a valid email', () => {
  const uttered = 'My email is alex@gmail.commy';
  const intent = interpretAccount(uttered, phrases);
  assert.equal(intent.original, uttered);
  assert.equal(normalizeSpokenEmail('alex@gmail.commy'), 'alex@gmail.commy');
  assert.equal(emailLooksValid('alex@gmail.commy'), false);
  assert.equal(intent.email, '');
  assert.equal(intent.emailUnclear, true);
  assert.equal(interpretAccount('alex at gmail dot commy', phrases).email, '');
  assert.equal(interpretAccount('alex at gmail dot commy', phrases).emailUnclear, true);
});

test('retains the email and the name together', () => {
  const intent = interpretAccount('Hello, my name is Alex. My email address is alex@example.com.', phrases);
  const held = retainAccountFields(emptyHeldAccount(), intent);
  assert.equal(held.email, 'alex@example.com');
  assert.equal(held.name, 'Alex');
  assert.equal(firstHeldField(held), 'email');
});

test('confirming one field does not discard the other', () => {
  const intent = interpretAccount('My name is Alex. My email is alex@example.com.', phrases);
  const held = retainAccountFields(emptyHeldAccount(), intent);
  const afterEmail = acceptHeldConfirmation(held, 'email');
  assert.equal(afterEmail.email, '');
  assert.equal(afterEmail.name, 'Alex');
  assert.equal(firstHeldField(afterEmail), 'name');
  const afterName = acceptHeldConfirmation(held, 'name');
  assert.equal(afterName.name, '');
  assert.equal(afterName.email, 'alex@example.com');
  assert.equal(firstHeldField(afterName), 'email');
});

test('keeps yes and no confirmation distinct', () => {
  const yes = interpretAccount('yes', phrases);
  assert.equal(yes.yes, true);
  assert.equal(yes.correction, false);
  assert.equal(yes.email, '');
  assert.equal(yes.name, '');
  assert.equal(yes.original, 'yes');
  const no = interpretAccount('that is not correct', phrases);
  assert.equal(no.yes, false);
  assert.equal(no.correction, true);
  assert.equal(no.email, '');
  assert.equal(no.name, '');
  assert.equal(no.emailUnclear, false);
});

test('understands a natural request to register or log in', () => {
  assert.equal(accountChoice('I want to register'), 'register');
  assert.equal(accountChoice('I want to create an account'), 'register');
  assert.equal(accountChoice('I want to log in'), 'login');
  assert.equal(accountChoice('I already have an account'), 'login');
  assert.equal(accountChoice('I do not have an account. I want to register'), 'register');
  assert.equal(accountChoice('መመዝገብ እፈልጋለሁ'), 'register');
  assert.equal(accountChoice('መግባት እፈልጋለሁ'), 'login');
  assert.equal(accountChoice('አካውንት አለኝ'), 'login');
});

test('extracts a natural name and email without extra words', () => {
  assert.equal(interpretAccount('My name is Sara Bekele.', phrases).name, 'Sara Bekele');
  assert.equal(interpretAccount('I am Sara Bekele.', phrases).name, 'Sara Bekele');
  assert.equal(interpretAccount('Please use Sara Bekele.', phrases).name, 'Sara Bekele');
  assert.equal(interpretAccount('My full name is Sara Bekele.', phrases).name, 'Sara Bekele');
  assert.equal(interpretAccount('Please use Sara Bekele.', phrases).email, '');
  const spoken = interpretAccount('My email address is sara at example dot com.', phrases);
  assert.equal(spoken.email, 'sara@example.com');
  assert.equal(spoken.emailUnclear, false);
  assert.equal(interpretAccount('Please use sara at example dot com.', phrases).email, 'sara@example.com');
  assert.equal(interpretAccount('My email is sara@example.com.', phrases).email, 'sara@example.com');
});

test('corrects only the field the person names', () => {
  const current = { name: 'Alex', email: 'alex@example.com' };
  const anotherEmail = interpretAccount('Use another email', phrases);
  assert.deepEqual(applyAccountFields(current, anotherEmail, 'email'), { name: 'Alex', email: '' });
  const renamed = interpretAccount('My name is actually Sara Bekele', phrases);
  assert.equal(renamed.name, 'Sara Bekele');
  assert.deepEqual(applyAccountFields(current, renamed, 'email'), { name: 'Sara Bekele', email: 'alex@example.com' });
  const wrong = interpretAccount('No, that is wrong', phrases);
  assert.equal(wrong.correction, true);
  assert.deepEqual(applyAccountFields(current, wrong, 'name'), { name: '', email: 'alex@example.com' });
  assert.deepEqual(applyAccountFields(current, wrong, 'email'), { name: 'Alex', email: '' });
});

test('understands Amharic name, email, and correction', () => {
  const named = interpretAccount('ስሜ ሳራ በቀለ ነው', phrases);
  assert.equal(named.name, 'ሳራ በቀለ');
  assert.equal(named.email, '');
  assert.equal(interpretAccount('እኔ ሳራ በቀለ ነኝ', phrases).name, 'ሳራ በቀለ');
  const email = interpretAccount('ኢሜይሌ sara at example dot com ነው', phrases);
  assert.equal(email.email, 'sara@example.com');
  assert.equal(email.name, '');
  const wrong = interpretAccount('አይ አይደለም', phrases);
  assert.equal(wrong.correction, true);
  assert.equal(wrong.yes, false);
  const changed = interpretAccount('ኢሜይሉን ቀይር', phrases);
  assert.equal(changed.clearEmail, true);
  assert.equal(changed.clearName, false);
  assert.deepEqual(
    applyAccountFields({ name: 'ሳራ በቀለ', email: 'sara@example.com' }, changed, ''),
    { name: 'ሳራ በቀለ', email: '' },
  );
});

test('understands sign in and register even when the words run together', () => {
  assert.equal(accountChoice('sign in'), 'login');
  assert.equal(accountChoice('Sign in.'), 'login');
  assert.equal(accountChoice('signing in'), 'login');
  assert.equal(accountChoice('login'), 'login');
  assert.equal(accountChoice('register'), 'register');
  assert.equal(accountChoice('sign up'), 'register');
  assert.equal(interpretAccount('sign in', phrases).signIn, true);
  assert.equal(interpretAccount('register', phrases).register, true);
  assert.equal(interpretAccount('no', phrases).correction, true);
  assert.equal(interpretAccount('no', phrases).yes, false);
});

test('the sign-in loop confirms held fields one at a time', () => {
  const source = readFileSync(new URL('../components/BlindConversation.tsx', import.meta.url), 'utf8');
  assert.match(source, /held = retainAccountFields\(held, intent\)/);
  assert.match(source, /held = acceptHeldConfirmation\(held, kind\)/);
  assert.match(source, /confirmLine\(kind, held\[kind\]\)/);
});
