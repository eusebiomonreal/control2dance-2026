<?php
/**
 * Plugin Name: EDD Data Exporter (v8 - GLOBAL HUNTER)
 * Description: Busca IDs de transacciones en TODA la base de datos de meta
 * Version: 8.0.0
 */

if (!defined('ABSPATH')) exit;

class EDD_Data_Exporter_V8 {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_post_export_edd_data_v8', [$this, 'handle_export']);
    }
    
    public function add_admin_menu() {
        add_menu_page('EDD Export v8', 'EDD Export v8', 'manage_options', 'edd-data-exporter-v8', [$this, 'admin_page'], 'dashicons-admin-site', 100);
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>🎯 Cazador Global de IDs (v8)</h1>
            <p>Este plugin va a buscar cualquier texto que parezca un ID de Stripe (pi_, cs_, ch_) en TODAS las tablas de metatados.</p>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="export_edd_data_v8">
                <?php wp_nonce_field('export_edd_data_v8', 'export_nonce'); ?>
                <?php submit_button('🚀 Iniciar Cacería Global'); ?>
            </form>
        </div>
        <?php
    }
    
    public function handle_export() {
        if (!current_user_can('manage_options')) wp_die('Permisos insuficientes');
        check_admin_referer('export_edd_data_v8', 'export_nonce');
        
        $diag = [
            'exported_at' => current_time('mysql'),
            'stripe_hunt' => $this->hunt_for_stripe_ids(),
            'paypal_hunt' => $this->hunt_for_paypal_ids(),
            'recent_orders' => $this->get_recent_orders_summary(50),
        ];
        
        $json = json_encode($diag, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="edd-global-hunt-v8-' . date('Y-m-d-His') . '.json"');
        echo $json; exit;
    }
    
    private function hunt_for_stripe_ids() {
        global $wpdb;
        $found = [];
        
        $tables = [
            "{$wpdb->prefix}postmeta" => ['id' => 'post_id', 'key' => 'meta_key', 'val' => 'meta_value'],
            "{$wpdb->prefix}edd_ordermeta" => ['id' => 'edd_order_id', 'key' => 'meta_key', 'val' => 'meta_value'],
            "{$wpdb->prefix}edd_order_transactions" => ['id' => 'order_id', 'key' => 'gateway', 'val' => 'transaction_id']
        ];

        foreach ($tables as $table => $cols) {
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table'");
            if (!$table_exists) continue;

            $query = "SELECT * FROM $table WHERE {$cols['val']} LIKE 'pi_%' OR {$cols['val']} LIKE 'cs_%' OR {$cols['val']} LIKE 'ch_%' LIMIT 50";
            $results = $wpdb->get_results($query);
            if ($results) {
                $found[$table] = $results;
            }
        }
        return $found;
    }

    private function hunt_for_paypal_ids() {
        global $wpdb;
        $found = [];
        
        // Buscamos algo parecido a un ID de PayPal (mayúsculas y números, longitud ~17)
        // Pero mejor buscamos por nombres de llave conocidos si el like es muy pesado
        $tables = [
            "{$wpdb->prefix}edd_ordermeta" => "meta_key = 'paypal_order_id' OR meta_key = '_edd_payment_transaction_id'",
            "{$wpdb->prefix}postmeta" => "meta_key = '_edd_payment_transaction_id'"
        ];

        foreach ($tables as $table => $where) {
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table'");
            if (!$table_exists) continue;

            $query = "SELECT * FROM $table WHERE $where LIMIT 50";
            $results = $wpdb->get_results($query);
            if ($results) {
                $found[$table] = $results;
            }
        }
        return $found;
    }

    private function get_recent_orders_summary($limit = 50) {
        global $wpdb;
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}edd_orders'");
        if ($table_exists) {
            return $wpdb->get_results("SELECT id, order_number, gateway, status, total, date_created FROM {$wpdb->prefix}edd_orders ORDER BY id DESC LIMIT $limit");
        }
        return [];
    }
}
new EDD_Data_Exporter_V8();
