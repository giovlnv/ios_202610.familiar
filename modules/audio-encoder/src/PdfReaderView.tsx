import { requireNativeView } from 'expo';
import { ViewProps } from 'react-native';

export type PdfReaderProps = ViewProps & { uri: string; page: number; onPageChange?: (e: { nativeEvent: { page: number; of: number } }) => void };

export default requireNativeView<PdfReaderProps>('AudioEncoder');
