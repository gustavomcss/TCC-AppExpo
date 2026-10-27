import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Runs `onHidden` once a Modal is gone. iOS reports it through the Modal's `onDismiss`, which the
 * caller wires to the returned function; Android has no `onDismiss`, and there nothing needs to
 * wait for the Modal, so the callback runs as soon as `visible` turns false. It exists because iOS
 * cannot present a Modal or change screen under one that is still closing.
 */
export function useHiddenCallback(
    visible: boolean,
    onHidden?: () => void,
): (() => void) | undefined {
    const wasVisible = useRef(visible);
    const hiddenCallback = useRef(onHidden);
    useEffect(() => {
        hiddenCallback.current = onHidden;
    });
    useEffect(() => {
        if (wasVisible.current && !visible && Platform.OS !== 'ios') {
            hiddenCallback.current?.();
        }
        wasVisible.current = visible;
    }, [visible]);

    return onHidden;
}
