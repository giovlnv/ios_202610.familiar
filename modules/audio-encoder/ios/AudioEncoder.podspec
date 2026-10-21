Pod::Spec.new do |s|
  s.name           = 'AudioEncoder'
  s.version        = '1.0.0'
  s.summary        = 'Encode WAV to m4a'
  s.description    = 'Encode WAV to m4a with AVFoundation'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '17.0'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'PDFKit'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
