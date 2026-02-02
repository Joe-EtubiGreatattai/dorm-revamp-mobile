/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import { Text as DefaultText, View as DefaultView, StyleSheet, TextStyle } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme, useFontSize } from '@/context/ThemeContext';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const { fontSizeMultiplier } = useFontSize();

  const flattenStyle = StyleSheet.flatten(style) as TextStyle;
  const scaledStyle: TextStyle = {};

  // If a font size is specified, scale it. 
  // If not, we could assume a default base (e.g., 14 or 16), 
  // but to avoid breaking layouts, we only apply the multiplier if it's NOT 1.
  if (flattenStyle?.fontSize) {
    scaledStyle.fontSize = flattenStyle.fontSize * fontSizeMultiplier;
  } else if (fontSizeMultiplier !== 1) {
    // If no font size is specified but we have a multiplier, 
    // we need to set a base size to scale from. 
    // Standard React Native default is 14.
    scaledStyle.fontSize = 14 * fontSizeMultiplier;
  }

  return <DefaultText style={[{ color }, style, scaledStyle]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
