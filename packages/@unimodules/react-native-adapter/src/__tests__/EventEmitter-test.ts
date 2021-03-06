import { Platform } from 'react-native';

let EventEmitter;

beforeEach(() => {
  ({ EventEmitter } = require('../EventEmitter'));
});

afterEach(() => {
  jest.resetModules();
});

it(`emits events to listeners`, () => {
  const mockNativeModule = _createMockNativeModule();
  const emitter = new EventEmitter(mockNativeModule);

  const mockListener = jest.fn();
  emitter.addListener('test', mockListener);

  emitter.emit('test');
  expect(mockListener).toHaveBeenCalledTimes(1);
  expect(mockListener).toHaveBeenLastCalledWith();

  emitter.emit('test', 'hello', 'world');
  expect(mockListener).toHaveBeenCalledTimes(2);
  expect(mockListener).toHaveBeenLastCalledWith('hello', 'world');
});

it(`removes all listeners of an event`, () => {
  const mockNativeModule = _createMockNativeModule();
  const emitter = new EventEmitter(mockNativeModule);

  const mockListener = jest.fn();
  emitter.addListener('test', mockListener);
  emitter.removeAllListeners('test');

  emitter.emit('test');
  expect(mockListener).not.toHaveBeenCalled();
});

it(`removes a single event subscription`, () => {
  const mockNativeModule = _createMockNativeModule();
  const emitter = new EventEmitter(mockNativeModule);

  const mockListener = jest.fn();
  const subscription = emitter.addListener('test', mockListener);
  emitter.removeSubscription(subscription);

  emitter.emit('test');
  expect(mockListener).not.toHaveBeenCalled();
});

// NOTE: this test currently fails because of NativeEventEmitter's design
it.skip(`doesn't emit events to other emitters' listeners`, () => {
  const mockNativeModule1 = _createMockNativeModule();
  const emitter1 = new EventEmitter(mockNativeModule1);

  const mockNativeModule2 = _createMockNativeModule();
  const emitter2 = new EventEmitter(mockNativeModule2);

  const mockListener1 = jest.fn();
  emitter1.addListener('test', mockListener1);
  emitter2.emit('test');

  expect(mockListener1).not.toHaveBeenCalled();
});

// NOTE: this test currently fails because of NativeEventEmitter's design
it.skip(`doesn't remove other emitters' listeners`, () => {
  const mockNativeModule1 = _createMockNativeModule();
  const emitter1 = new EventEmitter(mockNativeModule1);

  const mockNativeModule2 = _createMockNativeModule();
  const emitter2 = new EventEmitter(mockNativeModule2);

  const mockListener1 = jest.fn();
  emitter1.addListener('test', mockListener1);
  emitter2.removeAllListeners('test');

  emitter1.emit('test');
  expect(mockListener1).toHaveBeenCalled();
});

describe('subscriptions', () => {
  it(`removes itself`, () => {
    const mockNativeModule = _createMockNativeModule();
    const emitter = new EventEmitter(mockNativeModule);

    const mockListener = jest.fn();
    const subscription = emitter.addListener('test', mockListener);
    subscription.remove();

    emitter.emit('test');
    expect(mockListener).not.toHaveBeenCalled();
  });
});

describe('Android', () => {
  let originalOS;

  beforeAll(() => {
    originalOS = Platform.OS;
  });

  beforeEach(() => {
    Platform.OS = 'android';
  });

  afterAll(() => {
    Platform.OS = originalOS;
  });

  it(`notifies the native module to start and stop observing events`, () => {
    const mockNativeModule = _createMockNativeModule();
    const emitter = new EventEmitter(mockNativeModule);

    // Start observing only when we add the first listener
    const subscription1 = emitter.addListener('test', () => {});
    expect(mockNativeModule.startObserving).toHaveBeenCalledTimes(1);
    const subscription2 = emitter.addListener('test', () => {});
    expect(mockNativeModule.startObserving).toHaveBeenCalledTimes(1);
    const subscription3 = emitter.addListener('other', () => {});
    expect(mockNativeModule.startObserving).toHaveBeenCalledTimes(1);

    // Stop observing only when we remove the last listener
    emitter.removeSubscription(subscription1);
    expect(mockNativeModule.stopObserving).not.toHaveBeenCalled();
    emitter.removeSubscription(subscription3);
    expect(mockNativeModule.stopObserving).not.toHaveBeenCalled();
    emitter.removeSubscription(subscription2);
    expect(mockNativeModule.stopObserving).toHaveBeenCalledTimes(1);
  });

  it(`notifies the native module to stop observing when removing all listeners`, () => {
    const mockNativeModule = _createMockNativeModule();
    const emitter = new EventEmitter(mockNativeModule);

    emitter.addListener('test', () => {});
    emitter.addListener('test', () => {});
    emitter.removeAllListeners('test');
    expect(mockNativeModule.stopObserving).toHaveBeenCalledTimes(1);
  });

  it(`notifies the native module to stop observing when a subscription removes itself`, () => {
    const mockNativeModule = _createMockNativeModule();
    const emitter = new EventEmitter(mockNativeModule);

    const mockListener = jest.fn();
    const subscription = emitter.addListener('test', mockListener);
    expect(mockNativeModule.startObserving).toHaveBeenCalledTimes(1);

    subscription.remove();
    expect(mockNativeModule.stopObserving).toHaveBeenCalledTimes(1);
  });

  it(`removes subscriptions idempotently`, () => {
    const mockNativeModule = _createMockNativeModule();
    const emitter = new EventEmitter(mockNativeModule);

    const mockListener = jest.fn();
    const subscription1 = emitter.addListener('test', mockListener);
    const subscription2 = emitter.addListener('test', mockListener);
    expect(mockNativeModule.startObserving).toHaveBeenCalledTimes(1);

    emitter.removeSubscription(subscription1);
    emitter.removeSubscription(subscription1);
    subscription1.remove();
    subscription1.remove();
    expect(mockNativeModule.stopObserving).not.toHaveBeenCalled();

    emitter.removeSubscription(subscription2);
    expect(mockNativeModule.stopObserving).toHaveBeenCalledTimes(1);
  });
});

function _createMockNativeModule() {
  return {
    startObserving: jest.fn(),
    stopObserving: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };
}
