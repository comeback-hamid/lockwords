# Sets App Store signing on the generated iOS project (ios/ is made again by prebuild; this runs after it).
# The profiles are made with the App Store Connect key and live outside git (docs/testflight.md).

require 'xcodeproj'
p = Xcodeproj::Project.open('Lockwords.xcodeproj')
map = { 'Lockwords' => 'Lockwords AppStore', 'ExpoWidgetsTarget' => 'Lockwords Widgets AppStore' }
p.targets.each do |t|
  next unless map[t.name]
  t.build_configurations.each do |c|
    next unless c.name == 'Release'
    s = c.build_settings
    s['CODE_SIGN_STYLE'] = 'Manual'; s['DEVELOPMENT_TEAM'] = '977V8PWS54'
    s['CODE_SIGN_IDENTITY'] = 'Apple Distribution'; s['CODE_SIGN_IDENTITY[sdk=iphoneos*]'] = 'Apple Distribution'
    s['PROVISIONING_PROFILE_SPECIFIER'] = map[t.name]
    puts "#{t.name}: #{s['PRODUCT_BUNDLE_IDENTIFIER']} -> #{map[t.name]}"
  end
end
p.root_object.attributes['TargetAttributes']&.each_value { |a| a['ProvisioningStyle'] = 'Manual' }
p.save
